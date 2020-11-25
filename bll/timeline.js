const moment = require("moment");
const axios = require('axios');



async function fetchLocalFromAPI(country) {
  try {
    const response = await axios.get('https://corona.lmao.ninja/v2/historical/' + country);
    const countryData = response.data;


    let newLocal = {};
    newLocal.labels = [];
    newLocal.cases = [];

    if (typeof countryData === "undefined" || countryData === null) {
      console.error("countryData is NULL");
      return newLocal;
    }

    let yesterDay = 0;
    let countryDataCases = Object.entries(countryData.timeline.cases);

    countryDataCases.forEach(function(item, index) {
      let date = moment(item[0], "M/D/YYYY").format('DD.MM.YYYY');
      let casesToday = parseInt(item[1]);
      let newToday = casesToday - yesterDay;
      yesterDay = casesToday;
      newLocal.labels.push(date);
      newLocal.cases.push(newToday);
    });

    return newLocal;
  } catch(e) {
    console.error(e);
    return false;
  }
}


async function fetchGlobalFromAPI() {
  try {
    const response = await axios.get('https://corona.lmao.ninja/v2/historical');

    let newGlobal = {};
    newGlobal.labels = [];
    newGlobal.cases = [];

    response.data.forEach(function(item,index) {
      let countryCases = Object.entries(item.timeline.cases);
      countryCases.forEach(function(countryItem, countryIndex) {
        let date = moment(countryItem[0], "M/D/YYYY").format('DD.MM.YYYY');
        let cases = (newGlobal.cases[countryIndex]) ? parseInt(newGlobal.cases[countryIndex]) + parseInt(countryItem[1]) : parseInt(countryItem[1]);
        newGlobal.labels[countryIndex] = date;
        newGlobal.cases[countryIndex] = cases;
      });
    });

    let yesterday = 0;
    newGlobal.cases.map(function(currentValue, index, arr){
      let casesToday = currentValue - yesterday;
      yesterday = currentValue;
      arr[index] = casesToday;
    });

    return newGlobal;
  } catch(e) {
    console.error(e);
    return false;
  }
}



async function fetchFromDB(app, country) {
  let getFromDB = new Promise(function(resolve, reject) {
    app.locals.timelines.findOne({country: country}, function(err,res) {
      if (err) {
        reject(err);
      }
      if (res) {
        resolve(res);
      } else {
        reject("DB query is NULL");
      }
    })
  });

  try {
    let timeline = await getFromDB;
    return timeline.data;
  } catch (e) {
    console.error(e);
    return false;
  }
}







async function getTimeline(app, country) {
  let yesterday = moment().add(-1, 'days').format("DD.MM.YYYY");
  // let resultDB = {
  //   labels: [],
  //   cases: []
  // };
  let resultDB = await fetchFromDB(app, country);
  let yesterdayStored = resultDB.labels.find(label=>{
    if(label === yesterday) return label;
  });

  // DB opdatert. Returnerer data og stopper
  // if (yesterdayStored) {
  //   return resultDB;
  // }
  // // DB mangler data. Kontakter API.
  let resultAPI = null;
  if (country === "global") {
    resultAPI = await fetchGlobalFromAPI();
  } else {
    resultAPI = await fetchLocalFromAPI(country);
    console.log(resultAPI);
  }
  // resultAPI.labels.shift()
  // resultAPI.cases.shift()
  // resultDB.labels = resultAPI.labels;
  // resultDB.cases = resultAPI.cases();
  // return resultDB;
  let yesterdayAPIIndex = false;
  let yesterdayAPILabel = resultAPI.labels.find(function(value, index, arr) {
    if (value === yesterday) {
      yesterdayAPIIndex = index;
      return value;
    }
  });

  if (yesterdayAPILabel && yesterdayAPIIndex) {
    resultDB.labels.push(yesterdayAPILabel);
    resultDB.cases.push(resultAPI.cases[yesterdayAPIIndex]);
    return resultDB;
  } else {
    return false;
  }
}






async function storeData(app, country, timeline) {
  let today = moment().format('YYYY.MM.DD');
  app.locals.timelines.updateOne({country: country}, { $set: {updated: today, data: timeline } },{upsert: true, new: true}, function(err, res) {
    if (err) {
      console.error(err);
    }
  });
}




async function doCron(app, country) {
  let localTimeline = await getTimeline(app ,country);
  if (localTimeline) {
    storeData(app, country, localTimeline);
  }

  let globalTimeline = await getTimeline(app, "global");
  if (globalTimeline) {
    storeData(app, 'global', globalTimeline);
  }
}






module.exports = {
  fetchLocalFromAPI : fetchLocalFromAPI,
  fetchGlobalFromAPI : fetchGlobalFromAPI,
  storeData : storeData,
  doCron : doCron
};
