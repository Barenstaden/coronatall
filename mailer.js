const Email = require('email-templates');
const nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'sistecoronatall@gmail.com',
        pass: process.env.EMAILPASS
    }
});

const email = new Email({
  message: {
    from: 'sistecoronatall@gmail.com'
  },
  preview: false,
  send: true,
  transport: transporter
});

module.exports = {
  coronaMail: function(app){
    app.locals.data.findOne({data:'totals'}, function(err,res){
      if (res) {
        createEmails(res);
      }
    });
    function createEmails(totals) {
      let data = {};
      // NOTE: Global
      data.totalInWorld = totals.globalData.total_cases;
      data.newInWorldToday = totals.globalData.total_new_cases_today;
      data.totalDeathsInWorld = totals.globalData.total_deaths;
      data.newDeathsInWorldToday = totals.globalData.total_new_deaths_today;

      // NOTE: Local
      data.totalInLocal = totals.localData.total_cases;
      data.newInLocalToday = totals.localData.total_new_cases_today;
      data.totalDeathsInLocal = totals.localData.total_deaths;
      data.newDeathsInLocalToday = totals.localData.total_new_deaths_today;



      app.locals.users.find({email: {$exists: true}}).toArray(function(err,users){
        if (!err) {
          users.filter(user => {
            data.worldSinceLast = data.totalInWorld - user.globalData.total_cases;
            data.worldDeathsSinceLast = data.totalDeathsInWorld - user.globalData.total_deaths;

            data.localSinceLast = data.totalInLocal - user.localData.total_cases;
            data.localDeathsSinceLast = data.totalDeathsInLocal - user.localData.total_deaths;
            sendEmail(user.email, data);
          })
        }
      })
    }
    function sendEmail(address, data) {
      email.send({
          template: 'corona-mail',
          message: {
            to: address
          },
          locals: {
            data: data
          }
        })
        .then(res => {
          console.log("OK");
          console.log('res.originalMessage', res.originalMessage)
        })
        .catch(console.error);
    }
  }
}
