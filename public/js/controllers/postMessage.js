define(['./module', 'moment'], function (appModule, moment) {
    
    'use strict';
    
    appModule.controller('PostMessageController', ['$scope', '$location', 'messageService', 'alertsService', 'eventService', 
        function($scope, $location, messageService, alertsService, eventService) {
        
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        var afterTomorrow = new Date();
        afterTomorrow.setDate(tomorrow.getDate() + 2);
        var events = [
          { date: tomorrow, status: 'full' },
          { date: afterTomorrow, status: 'partially' }
        ];
        
        $scope.dateOptions = {
            formatYear: 'yy',
            startingDay: 1
        };
 
        $scope.format = 'dd-MMMM-yyyy';
        $scope.status = {
            opened: false
        };
        
        $scope.postMessage = {
            providers : ['twitter', 'facebook', 'linkedin'],
            selectedProviders : [],
            message : '',
            date : moment(new Date()),
            send : function() {
                if($scope.postMessage.selectedProviders.length===0)
                    alertsService.warn("Aucun provider n'est sélectionné");
                else if($scope.postMessage.message.length>0) {
                    messageService.postMessage($scope.postMessage.selectedProviders, $scope.postMessage.message, $scope.postMessage.date).then(function(results) {
                        console.log("results: ",results);
                        alertsService.success("Message publié avec succès");
                    }, function(err) {
                        alertsService.error("Erreur dans l'envoit de message. Err: "+err);
                    });
                } else {
                    alertsService.warn("Le message est vide"); 
                }
                
            },
            getDayClass : function(date) {
                var dayToCheck = new Date(date).setHours(0,0,0,0);                
                for (var i=0;i<events.length;i++) {
                    var currentDay = new Date(events[i].date).setHours(0,0,0,0);
                    if (dayToCheck === currentDay) {
                        return events[i].status;
                    }
                }
                return '';
            }           
        };
        var modifyParams = $location.search();
        console.log("url params ?", modifyParams);
        if(modifyParams.eventId) {

            eventService.retrieveOne(modifyParams.eventId).then(function(messageEvent) {
                console.log("event retrieved ", messageEvent);  
                $scope.postMessage.date = new Date(messageEvent.dateTime);
                $scope.postMessage.selectedProviders=messageEvent.eventParams[0];
                $scope.postMessage.message=messageEvent.eventParams[1];
                $scope.postMessage.eventId=messageEvent.eventId;
            });            
        } else {
           $scope.postMessage.date = moment($scope.postMessage.date).add(1, 'hours').minutes(0).seconds(0).format();
        }

        $scope.clear = function () {
            $scope.postMessage.date = null;
        };

        // Disable weekend selection
        $scope.disabled = function(date) {
            return date.getTime() < Date.now();
            //return ( date.getDay() === 0 || date.getDay() === 6 );
        };

        $scope.toggleMin = function() {
            $scope.minDate = $scope.minDate ? null : new Date();
        };
        $scope.toggleMin();
        $scope.maxDate = new Date(2020, 5, 22);

        $scope.open = function($event) {
            console.log('open event: ', $event);
            $scope.status.opened = true;
        };

        $scope.setDate = function(year, month, day) {
            $scope.postMessage.date = new Date(year, month, day);
        };

        //timepicker
        $scope.hstep = 1;
        $scope.mstep = 5;
        $scope.ismeridian = false;
        $scope.changed = function () {
            console.log('Time changed to: ' + $scope.postMessage.date);
        };
    }]);
});