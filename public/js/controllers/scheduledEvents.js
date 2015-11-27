define(['./module'], function(appModule) {
    
    'use strict';
    
    appModule.controller('ScheduledEventsController', ['$scope', 'eventService', function($scope, eventService) {
        
        $scope.events = [];
        $scope.displayedCollection = [].concat($scope.events);
        
        eventService.retrieveAll().then(function(events) {
            console.log("events retrieved: ", events);
            events.forEach(function(event) {
                var row = { 
                    type : event.event, 
                    date : event.dateTime,
                    providers : event.eventParams[0],
                    params : parseParams(event.eventParams, event.event), 
                    id: event.eventId
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
           console.log("err retrieving events: ", err); 
        });
        
        $scope.displayFileSize = function(sizeInBytes) {
            
            var sizeInKiloBytes = sizeInBytes/1024;
            if(sizeInKiloBytes<1) {
                return sizeInBytes+" O";
           
            } else {                
                var sizeInMegaBytes = sizeInKiloBytes/1024;                
                if(sizeInMegaBytes<1) {
                     return Number(sizeInKiloBytes).toFixed(2)+" kO";
                } else {
                    var sizeInGigaBytes = sizeInMegaBytes/1024;                    
                    if(sizeInGigaBytes<1) {
                        return Number(sizeInMegaBytes).toFixed(2)+" MO";
                    } else {
                         return Number(sizeInMegaBytes).toFixed(2)+" GO";
                    }
                }
            }
        };
        
        $scope.delete = function(event) {
            //TODO open modal window with loading gif, and close it after
            eventService.deleteEvent(event.id).then(function() {

                var index = $scope.events.indexOf(event);
                if (index !== -1) {
                    $scope.events.splice(index, 1);
                }
                
            }, function(err) {
                console.log("err in seventService.delete ", err);
                
            });
        };
        
        $scope.modify = function(event) {
            //TODO
            //open modal popup with form data and save button
        };
        
        $scope.parseDate = function(dateString) {
            var date = new Date(dateString);
            console.log("date.getTime()", date.getTime());
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
                        value : params[4]
                    });
                    break;
            }
            return parsedParams;
        }

    }]);
    
});