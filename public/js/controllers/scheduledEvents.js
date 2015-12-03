define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('ScheduledEventsController', ['$scope', '$location', 'eventService', 'alertsService', 
                                                       function($scope, $location, eventService, alertsService) {
        
        $scope.events = [];
        $scope.displayedCollection = [].concat($scope.events);
        
        eventService.retrieveAll().then(function(events) {
            console.log("events retrieved: ", events);
            events.forEach(function(event) {
                var row = { 
                    type : event.event, 
                    date : moment(event.dateTime).format("dddd D MMMM YYYY à HH:mm"),
                    providers : event.eventParams[0],
                    params : parseParams(event.eventParams, event.event), 
                    id : event.eventId,
                    results : event.results,
                    error : event.error
                };                
                if(event.event === 'uploadVideo') {
                    row.attachment = {
                        originalFileName : event.eventParams[1].originalname,
                        size : event.eventParams[1].size
                    };
                }
                $scope.events.push(row);
                    
            });
           // $scope.events=events;
            $scope.displayedCollection = [].concat($scope.events);
        }, function(err) {
            alertsService.error("Impossible de récupérer les évènements enregistrés. Err: "+err);
        });
        
        $scope.displayFileSize = function(sizeInBytes) {
            
            var sizeInKiloBytes = sizeInBytes/1024;
            if(sizeInKiloBytes<1) {
                return sizeInBytes+" o";           
            } else {                
                var sizeInMegaBytes = sizeInKiloBytes/1024;                
                if(sizeInMegaBytes<1) {
                     return Number(sizeInKiloBytes).toFixed(2)+" ko";
                } else {
                    var sizeInGigaBytes = sizeInMegaBytes/1024;                    
                    return Number(sizeInMegaBytes).toFixed(2) + (sizeInGigaBytes<1 ? " Mo": " Go");
                }
            }
        };
        
        $scope.deleteEvent = function(event) {
            console.log("delete event: ", event);
            //TODO open modal window with loading gif, and close it after
            eventService.deleteEvent(event.id).then(function() {
                var index = $scope.events.indexOf(event);
                if (index !== -1) {
                    $scope.events.splice(index, 1);
                }
            }, function(err) {
                alertsService.error("Impossible d'effacer l'évènement. Err: "+err);
            });
        };
        
        $scope.modify = function(event) {
            //TODO
            //open modal popup with form data and save button
            if(event.type==='message') {
                $location.url('/postMessage?eventId='+event.id);
            }else if(event.type ==='uploadVideo') {
                $location.url('/uploadFile?eventId='+event.id);
            }
        };
        
        $scope.parseDate = function(dateString) {
            var date = new Date(dateString);
            return date.getTime();
        };
        
        function parseParams(params, eventType) {

            var parsedParams = [];
            console.log(typeof eventType);
            switch(eventType) {
                case 'message' :                    
                    parsedParams.push({
                        name : 'message',
                        value : params[1]
                    });
                    break;
                    
                case 'uploadVideo' :
                    parsedParams.push({
                        name : 'titre',
                        value : params[2]
                    });
                    parsedParams.push({
                        name : 'description',
                        value : params[3]
                    });
                    parsedParams.push({
                        name : 'tags',
                        value : params[4].toString()
                    });
                    break;
            }
            return parsedParams;
        }
    }]);

});