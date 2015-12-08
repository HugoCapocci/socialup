define(['./module'], function(appModule) {
    
    'use strict';
    
    appModule.controller('ChainedEventsModalController', ['$scope', '$rootScope', '$location', '$uibModalInstance', 'eventService', 'alertsService', 'eventId', 
    function($scope, $rootScope, $location, $uibModalInstance, eventService, alertsService, eventId) {
       
        $scope.modal = {
            title : 'ChainedEvents',
            url : 'views/chainedEvents.html', 
            ok : function() {
                $uibModalInstance.close();
            },
            cancel : function () {
                $uibModalInstance.dismiss('cancel');
            }
        };
        
        $scope.chainedEvents = [];
        eventService.retrieveChainedEvents(eventId).then(function(events) {
            console.log("chainedEvents founds ", events);
            
            $scope.chainedEvents = events.map(function(event) {
                event.params = eventService.parseParams(event.eventParams, event.eventType);   
                return event;
            });
        });

        $scope.deleteEvent = function(event) {
            /*eventService*/
            console.log("delete event: ", event);
            eventService.deleteChainedEvent(event._id, eventId).then(function() {
                var index = $scope.chainedEvents.indexOf(event);
                if (index !== -1) {
                    $scope.chainedEvents.splice(index, 1);
                }
            }, function(err) {
                alertsService.error("Impossible d'effacer l'évènement. Err: "+err);
            });
        };

    }]);
    
});