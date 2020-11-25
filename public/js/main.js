var socket = io();
moment.locale('nb');
const coronaNumbers = new Vue({
  el: '#coronaNumbers',
  data: {
    ready: false,
    globalCoronaData: null,
    oldGlobalCoronaData: null,
    localCoronaData: null,
    oldLocalCoronaData: null,
    lastUpdated: null,
    timeNow: null,
    user: null,
    updating: false,
    isRegistered: false,
    email: null,
    emailSent: false,
    signedOn: false
  },
  created: function(){
    this.user = localStorage.getItem('coronaUser');
    if (!this.user) {
      this.createUser();
    } else {
      this.fetchData();
    }
  },
  methods: {
    createUser: function(){
      socket.emit('create_user', callback => {
        localStorage.setItem('coronaUser', callback);
        this.user = callback;
        this.fetchData();
      })
    },
    fetchData: function(){
      this.updating = true;
      socket.emit('corona_data', this.user, callback => {
        this.signedOn = callback.email;
        this.localCoronaData = callback.local;
        this.globalCoronaData = callback.global;
        if (callback.oldLocal && callback.oldGlobal) {
          this.oldLocalCoronaData = callback.oldLocal;
          this.oldGlobalCoronaData = callback.oldGlobal;
        }
        this.lastUpdated = moment();
        this.timeNow = moment(this.lastUpdated).fromNow();
        this.countSinceLastUpdate();
        this.ready = true;
      });
      setTimeout(() =>{
        this.updating = false;
      }, 100);
    },
    countSinceLastUpdate: function(){
      setInterval(() => {
        this.timeNow = moment(this.lastUpdated).fromNow();
      }, 2000);
    },
    saveEmail: function(){
      socket.emit('save_email', this.email, this.user, callback => {
        if (callback.ok) {
          this.emailSent = true;
        }
      });
    }

  }
});


const coronaTimeline = new Vue({
  el: '#coronaTimeline',
  data: {
    ready: true,
    global: false,
    local: false,
    timelineData: null,
    labels: null,
    cases: null,
    timeline: null,
    timelineChart: null
  },
  created: function(){
    this.fetchData();
  },
  methods: {
    selectTimeline: function(timeline){
      this.global = false;
      this.local = false;
      this[timeline] = true;
      if (timeline == 'local') {
        this.labels = this.timelineData.labels;
        this.cases = this.timelineData.cases;
      } else {
        this.labels = this.timelineData.global.data.labels;
        this.cases = this.timelineData.global.data.cases;
      }
      this.createChart();
      socket.emit('save_timeline_option', coronaNumbers.user, timeline);
    },
    fetchData: function() {
      socket.emit('corona_timeline', callback => {
        socket.emit('get_timeline_option', coronaNumbers.user, callback => {
          if (callback) {
            this[callback] = true;
            this.selectTimeline(callback);
          } else {
            this.selectTimeline('global');
          }
        });
        this.timelineData = callback;
      })
    },
    createChart: function(){
      if (this.timelineChart) {
        this.timelineChart.destroy();
      }
      this.timeline = $('#timeline-chart');

      this.timelineChart = new Chart(this.timeline, {
          type: 'line',
          options: {
            responsive: true,
            maintainAspectRatio: true,
            legend: {
              display: false,
            },
            scales: {
                xAxes: [{
                    display: false,
                }],
                yAxes: [{
                    display: true,
                    gridLines: {
                        color: 'rgba(0,0,0,0)',
                        display: false
                    },
                    ticks: {
                      fontColor: "#fff"
                    }
                }]
            },
          },
          data: {
            labels: this.labels,
            datasets: [
              {
                fill: false,
                lineTension: 0.4,
                borderColor: "#fff",
                borderWidth: 3,
                pointBorderWidth: 1,
                pointRadius: 1,
                pointHitRadius: 20,
                data: this.cases
              }
            ]
          }
      });
    }
  }
});

const news = new Vue({
  el: '#news',
  data: {
    allNews: null
  },
  created: function(){
    this.fetchData();
  },
  methods: {
    fetchData: function(){
      socket.emit('get_news', news => {
        this.allNews = news;
      })
    },
    openInNewTab: function(url){
      var win = window.open(url, '_blank');
      win.focus();
    },
    momentify: function(time){
      return moment(time).calendar();
    }
  }
});




function formatNumber(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1\.');
}
