define(['./module', 'moment', 'angular-i18n-fr'], function (appModule, moment) {
    
    'use strict';

    moment.locale('fr', {
        months : "janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre".split("_"),
        monthsShort : "janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.".split("_"),
        weekdays : "dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_"),
        weekdaysShort : "dim._lun._mar._mer._jeu._ven._sam.".split("_"),
        weekdaysMin : "Di_Lu_Ma_Me_Je_Ve_Sa".split("_"),
        longDateFormat : {
            LT : "HH:mm",
            LTS : "HH:mm:ss",
            L : "DD/MM/YYYY",
            LL : "D MMMM YYYY",
            LLL : "D MMMM YYYY LT",
            LLLL : "dddd D MMMM YYYY LT"
        },
        calendar : {
            sameDay: "[Aujourd'hui à] LT",
            nextDay: '[Demain à] LT',
            nextWeek: 'dddd [à] LT',
            lastDay: '[Hier à] LT',
            lastWeek: 'dddd [dernier à] LT',
            sameElse: 'L'
        },
        relativeTime : {
            future : "dans %s",
            past : "il y a %s",
            s : "quelques secondes",
            m : "une minute",
            mm : "%d minutes",
            h : "une heure",
            hh : "%d heures",
            d : "un jour",
            dd : "%d jours",
            M : "un mois",
            MM : "%d mois",
            y : "un an",
            yy : "%d ans"
        },
        ordinalParse : /\d{1,2}(er|ème)/,
        ordinal : function (number) {
            return number + (number === 1 ? 'er' : 'ème');
        },
        meridiemParse: /PD|MD/,
        isPM: function (input) {
            return input.charAt(0) === 'M';
        },
        // in case the meridiem units are not separated around 12, then implement
        // this function (look at locale/id.js for an example)
        // meridiemHour : function (hour, meridiem) {
        //     return /* 0-23 hour, given meridiem token and hour 1-12 */
        // },
        meridiem : function (hours/*, minutes, isLower*/) {
            return hours < 12 ? 'PD' : 'MD';
        },
        week : {
            dow : 1, // Monday is the first day of the week.
            doy : 4  // The week that contains Jan 4th is the first week of the year.
        }
    });
    
    appModule.controller(
        'MainController',
        ['$scope', '$rootScope', '$location', '$window', 'alertsService', 'userService',
        function($scope, $rootScope, $location, $window, alertsService, userService) {
            
            var parameters= $location.search();
            if(parameters.close) {
                alertsService.success('OAuth authentication sucessfull');
                $window.close();
            }
            
            var localData = userService.getUserData();
            console.log("localData found: ",localData);
           /* if(!localData)
                $location.path('/login');*/
            
            $scope.closeAlert=function($index) {
                console.log("close alert index: ", $index);
                //delete $rootScope.alerts[$index];
                $rootScope.alerts.splice($index, 1);
                //$rootScope.alerts.slice($index, 1);
            };
            //MENU
            
                        
            $scope.signout = function() {
                userService.deleteData();
            };

        }]
    );
    
    // progressing bar, in a modal
    appModule.controller('WaitingModalController', ['$scope', '$rootScope', '$location', '$uibModalInstance', 
    function($scope, $rootScope, $location, $uibModalInstance) {
       
        $scope.modal = {
            title : 'Traitement en cours',
            ok : function() {
                $uibModalInstance.close();
            },
            cancel : function () {
                $uibModalInstance.dismiss('cancel');
            },
            isLoading : true,
            type : 'warning',
            progress : 0
        };
        
        $rootScope.stopProgress = function(message) {
            $scope.modal.type='success';
            $scope.modal.message = message;
            $scope.modal.progress=100;
        };
        $rootScope.doProgress = function(progress) {
            if(progress<=25)
                $scope.modal.type='danger';
            else if(progress<=60)
                $scope.modal.type='warning';
            else
                $scope.modal.type='info';
            $scope.modal.progress = progress;
        };
        
    }]);
});