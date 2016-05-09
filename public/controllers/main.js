define(['./module', 'moment', 'angular-i18n-fr'], function(appModule, moment) {
  var MainController, WaitingModalController;
  moment.locale('fr', {
    months: "janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre".split("_"),
    monthsShort: "janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.".split("_"),
    weekdays: "dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_"),
    weekdaysShort: "dim._lun._mar._mer._jeu._ven._sam.".split("_"),
    weekdaysMin: "Di_Lu_Ma_Me_Je_Ve_Sa".split("_"),
    longDateFormat: {
      LT: "HH:mm",
      LTS: "HH:mm:ss",
      L: "DD/MM/YYYY",
      LL: "D MMMM YYYY",
      LLL: "D MMMM YYYY LT",
      LLLL: "dddd D MMMM YYYY LT"
    },
    calendar: {
      sameDay: "[Aujourd'hui à] LT",
      nextDay: '[Demain à] LT',
      nextWeek: 'dddd [à] LT',
      lastDay: '[Hier à] LT',
      lastWeek: 'dddd [dernier à] LT',
      sameElse: 'L'
    },
    relativeTime: {
      future: "dans %s",
      past: "il y a %s",
      s: "quelques secondes",
      m: "une minute",
      mm: "%d minutes",
      h: "une heure",
      hh: "%d heures",
      d: "un jour",
      dd: "%d jours",
      M: "un mois",
      MM: "%d mois",
      y: "un an",
      yy: "%d ans"
    },
    ordinalParse: /\d{1,2}(er|ème)/,
    ordinal: function(number) {
      return number + (number === 1 ? 'er' : 'ème');
    },
    meridiemParse: /PD|MD/,
    isPM: function(input) {
      return input.charAt(0) === 'M';
    },
    meridiem: function(hours) {
      var ref;
      return (ref = hours < 12) != null ? ref : {
        'PD': 'MD'
      };
    },
    week: {
      dow: 1,
      doy: 4
    }
  });
  MainController = (function() {
    function MainController($scope, $rootScope, $location, $window, alertsService1, userService) {
      var parameters;
      this.$scope = $scope;
      this.$rootScope = $rootScope;
      this.$location = $location;
      this.$window = $window;
      this.alertsService = alertsService1;
      this.userService = userService;
      console.log('MainController constructor loaded');
      parameters = this.$location.search();
      if (parameters.close) {
        alertsService.success('OAuth authentication sucessfull');
        this.$window.close();
      }
      this.localData = this.userService.getUserData();
      console.log("localData found: ", this.localData);
    }

    MainController.prototype.closeAlert = function($index) {
      console.log("close alert index: ", $index);
      return this.$rootScope.alerts.splice($index, 1);
    };

    MainController.prototype.signout = function() {
      return this.userService.deleteData();
    };

    MainController.prototype.model = {
      rows: [
        {
          columns: [
            {
              styleClass: 'col-md-3',
              widgets: [
                {
                  type: 'twitter',
                  config: {},
                  title: 'Derniers tweets'
                }
              ]
            }, {
              styleClass: "col-md-9",
              widgets: [
                {
                  type: 'videoPlayer',
                  config: {},
                  title: 'Chercher une vidéo'
                }
              ]
            }
          ]
        }
      ]
    };

    console.log('dashboard model: ', MainController.model);

    return MainController;

  })();
  MainController.$inject = ['$scope', '$rootScope', '$location', '$window', 'alertsService', 'userService'];
  appModule.controller('MainController', MainController);
  WaitingModalController = (function() {
    function WaitingModalController($scope, $rootScope, $location, $uibModalInstance1) {
      this.$scope = $scope;
      this.$rootScope = $rootScope;
      this.$location = $location;
      this.$uibModalInstance = $uibModalInstance1;
      this.$scope.modal = {
        title: 'Traitement en cours',
        ok: function() {
          return $uibModalInstance.close();
        },
        cancel: function() {
          return $uibModalInstance.dismiss('cancel');
        },
        isLoading: true,
        type: 'warning',
        progress: 0
      };
      this.$rootScope.stopProgress = function(message) {
        this.$scope.modal.type = 'success';
        this.$scope.modal.message = message;
        return this.$scope.modal.progress = 100;
      };
      this.$rootScope.doProgress = function(progress) {
        if (progress <= 25) {
          this.$scope.modal.type = 'danger';
        } else if (progress <= 60) {
          this.$scope.modal.type = 'warning';
        } else {
          this.$scope.modal.type = 'info';
        }
        return this.$scope.modal.progress = progress;
      };
      return;
    }

    return WaitingModalController;

  })();
  WaitingModalController.$inject = ['$scope', '$rootScope', '$location', '$uibModalInstance'];
  return appModule.controller('WaitingModalController', WaitingModalController);
});
