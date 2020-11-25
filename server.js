var express = require('express');
var app = express();
var path = require('path');
const fs = require('fs');
const assert = require('assert');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const axios = require('axios');
const moment = require("moment");
const CronJob = require('cron').CronJob;
const requestIp = require('request-ip');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const expressStaticGzip = require("express-static-gzip");
const mailer = require('./mailer.js');

const timeline = require("./bll/timeline.js");
const tools = require("./bll/tools.js");
require('dotenv').config();
const dbURL = process.env.DBURL;
const dbName = "coronatall";
const port = 5001;



app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/om', function(req, res){
  res.sendFile(__dirname + '/about.html');
});

app.get('/sitemap.xml', function(req, res){
  res.sendFile(__dirname + '/sitemap.xml');
});

app.get('/robots.txt', function(req, res){
  res.sendFile(__dirname + '/robots.txt');
});

app.get('/ip', function(req, res){
  let clientIp = requestIp.getClientIp(req);
  console.log("*********************************************************");
  console.log( moment().format('DD.MM.YYYY, HH:mm:ss') );
  console.log("From IP:", clientIp);
  console.log("*********************************************************");
  res.send(clientIp);
});

// app.use(express.static(path.join(__dirname, 'public')));
app.use("/", expressStaticGzip("./public/"));




async function fetchGlobalYesterdayAPI() {
  let yesterday = moment().add(-1, 'days').format("M/D/YY");
  let yesterdayGlobalCases = 0;
  let yesterdayGlobalDeaths = 0;
  try {
    const response = await axios.get('https://corona.lmao.ninja/v2/historical');
    response.data.forEach(function(item,index) {
      yesterdayGlobalCases += parseInt(item.timeline.cases[yesterday]);
      yesterdayGlobalDeaths += parseInt(item.timeline.deaths[yesterday]);
    });

    return {
      "yesterdayGlobalCases" : yesterdayGlobalCases,
      "yesterdayGlobalDeaths" : yesterdayGlobalDeaths
    };
  } catch (e) {
    console.error(e);
    return false;
  }
}



fetchCoronaData();
async function fetchCoronaData() {
  let getLocalData = async function() {
    try {
      const response = await axios.get('https://corona.lmao.ninja/v2/countries/norway');
      return tools.mapApiResultToLegacyFormat(response.data);
    } catch (e) {
      console.log(e);
    }
  };
  let getGlobalData = async function() {
    try {
      const responseToday = await axios.get('https://corona.lmao.ninja/v2/all');
      const responseYesterday = await fetchGlobalYesterdayAPI();
      return {
        "total_cases" : parseInt(responseToday.data.cases),
        "total_deaths" : parseInt(responseToday.data.deaths),
        "total_new_cases_today" : parseInt(responseToday.data.cases) - parseInt(responseYesterday.yesterdayGlobalCases),
        "total_new_deaths_today" : parseInt(responseToday.data.deaths) - parseInt(responseYesterday.yesterdayGlobalDeaths)
      };
    } catch(e){
      console.log(e);
    }
  };

  let newsFromVG = async function() {
    try {
      const response = await axios.get('http://www.vg.no/siste/?format=json&limit=30&size=100');
      // let news = response.data.filter(news => {
      //   if (news.title.toLowerCase().includes('corona') || news.title.toLowerCase().includes('korona') || news.title.toLowerCase().includes('covid') || news.title.toLowerCase().includes('smitte') || news.preamble.toLowerCase().includes('corona') || news.preamble.toLowerCase().includes('korona') || news.preamble.toLowerCase().includes('covid') || news.preamble.toLowerCase().includes('smitte')) {
      //     return news;
      //   }
      // });
      return response.data;
    } catch(e){
      console.log(e);
    }
  };

  let data = {};
  data.local = await getLocalData();
  data.global = await getGlobalData();
  data.news = await newsFromVG();
  // NOTE: Lagre nyeste data på ip 1 i stedet for å lage ny collection (?)
  app.locals.data.updateOne({data: 'totals'}, { $set: {globalData: data.global, localData: data.local } },{upsert: true}, function(err, res) {
    if (!err) {
      console.log("New data stored");
    }
  });
  app.locals.data.updateOne({data: 'news'}, { $set: {news: data.news } },{upsert: true, new: true}, function(err, res) {
    if (!err) {
      console.log("News stored");
    }
  });
}
// NOTE: Når apiet er oppe igjen
let timeout = setInterval(function(){ timer() }, 60000);

function timer() {
  fetchCoronaData();
}

function stopFunction() {
  clearInterval(timeout);
}

io.on('connection', function(socket){


  socket.on('create_user', function(callback){
    app.locals.data.findOne({data:'totals'}, function(err,res){
      app.locals.users.insertOne({localData: res.localData, globalData: res.globalData}, function(err,res){
        callback(res.insertedId);
      })
    });
  });


  socket.on('corona_data', async function(id, callback){
    var data = {};
    globalData();
    function globalData() {
      app.locals.data.findOne({data:'totals'}, function(err,res){
        if (res) {
          data.local = res.localData;
          data.global = res.globalData;
          userData();
        }
      });
    }
    function userData() {
      console.log('***************** Object id *****************');
      console.log(id);
      console.log('***************** Object id *****************');
      app.locals.users.findOne({_id: ObjectID(id)}, function(err,res){
        if (res) {
          data.oldLocal = res.localData;
          data.oldGlobal = res.globalData;
          data.email = res.email;
          updateUserData();
        }
      })
    }
    function updateUserData() {
      app.locals.users.updateOne({_id: ObjectID(id)}, { $set: {globalData: data.global, localData: data.local } },{upsert: true}, function(err, res) {
        if (!err) {
          callback(data);
        }
      });
    }

  });

  socket.on('save_timeline_option', function(id, timeline){
    app.locals.users.updateOne({_id: ObjectID(id)}, { $set: {timeline: timeline} },{upsert: true}, function(err, res) {
      if (err) {
        console.log(err);
      }
    });
  });

  socket.on('get_timeline_option', function(id, callback){
    app.locals.users.findOne({_id: ObjectID(id)}, function(err,res){
      if (res) {
        callback(res.timeline);
      }
    })
  });

  socket.on('get_news', function(callback){
    app.locals.data.findOne({data: 'news'}, function(err,res){
      if (res) {
        callback(res.news);
      }
    })
  });


  socket.on('corona_timeline', async function(callback) {
    let country = "norway";
    let today = moment().format('YYYY.MM.DD');
    app.locals.timelines.findOne({country: country}, async function(err,res) {
      if (err) {
        callback(false);
        return;
      }

      let getGlobal = new Promise(function(resolve, reject) {
        app.locals.timelines.findOne({country: 'global'}, function(err,res){
          if (res) {
            resolve(res);
          }
        })
      });

      let globalTimeline = await getGlobal;
      let chartData = res.data;
      chartData.global = globalTimeline;

      // Data i DB
      callback(chartData);
    });
  });

  socket.on('save_email', function(email, user, callback){
    app.locals.users.updateOne({_id: ObjectID(user)}, { $set: {email: email} },{upsert: true}, function(err, res) {
      if (err) {
        console.log(err);
      } else {
        callback(res);
      }
    });
  });
});






// NOTE: Hver dag kl 8 og 18
let coronaMail = new CronJob('0 8,18 * * *', function() {
  console.log("CRON email");
  mailer.coronaMail(app);
}, null, true, 'Europe/Oslo');
coronaMail.start();



// NOTE: Hver morgen kl 06
let cronTimeline = new CronJob('0 6 * * *', function() {
  console.log("CRON");
  timeline.doCron(app, "norway");
}, null, true, 'Europe/Oslo');
cronTimeline.start();


http.listen(port, function(){
  console.log('listening on port ' + port);
});



MongoClient.connect(dbURL, function(err, client) {
    assert.equal(null, err);
    const db = client.db(dbName);
    const users = db.collection('users');
    const data = db.collection('data');
    const timelines = db.collection('timelines');
    app.locals.users = users;
    app.locals.data = data;
    app.locals.timelines = timelines;

    timeline.doCron(app, "norway");
});