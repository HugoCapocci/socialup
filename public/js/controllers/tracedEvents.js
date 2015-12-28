define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('TracedEventsController',
    ['$scope', '$location', 'eventService', 'alertsService', 
    function($scope,  $location, eventService, alertsService) {

        $scope.events = [];
        $scope.displayedCollection = [].concat($scope.events);
        $scope.animationsEnabled = true;
  
        eventService.retrieveTracedEvents().then(function(events) {
            console.log("events retrieved: ", events);
            events.forEach(function(event) {
                var row = { 
                    type : event.eventType, 
                    date : moment(event.dateTime).format("dddd D MMMM YYYY à HH:mm"),
                    providers : event.providers,
                    id : event._id,
                    results : event.results,
                    error : event.error
                };
                $scope.events.push(row);
                    
            });
           // $scope.events=events;
            $scope.displayedCollection = [].concat($scope.events);
            console.log("$scope.displayedCollection: ",$scope.displayedCollection );
        }, function(err) {
            alertsService.error("Impossible de récupérer les évènements enregistrés. Err: "+err);
        });
        
        $scope.deleteEvent = function(event) {
            console.log("delete event: ", event);
            //TODO open modal window with loading gif, and close it after
            eventService.deleteScheduledEvent(event.id).then(function() {
                var index = $scope.events.indexOf(event);
                if (index !== -1) {
                    $scope.events.splice(index, 1);
                }
            }, function(err) {
                alertsService.error("Impossible d'effacer l'évènement. Err: "+err);
            });
        };
        
        $scope.parseDate = function(dateString) {
            var date = new Date(dateString);
            return date.getTime();
        };
        
        $scope.setSelected = function (idSelectedEvent, $index) {
            $scope.selectedEvent = $scope.displayedCollection[$index];
            /*$scope.selectedEvent.results = [{url:'https://www.facebook.com/video/embed?video_id=10153388750752499'}];            
            console.log("selectedEvent: ", $scope.selectedEvent);*/
        };
    }]);
    
});