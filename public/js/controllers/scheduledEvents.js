define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('ScheduledEventsController',
    ['$scope', '$location', '$uibModal', 'eventService', 'alertsService', 
    function($scope,  $location, $uibModal, eventService, alertsService) {

        $scope.events = [];
        $scope.displayedCollection = [].concat($scope.events);
        $scope.animationsEnabled = true;
      
        $scope.addChainedEvent = function(eventId) {
            openModal('PostMessage', eventId);
        };
        $scope.displayChainedEvents = function(eventId) {
            openModal('ChainedEvents', eventId);
        };
        function openModal(controller, eventId) {

            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'modalContent.html',
                controller: controller+'ModalController',
                size: 'lg',
                resolve: {
                    eventId : function() {
                        return eventId;
                    }
                }
            });
                       
            modalInstance.result.then(function(selectedItem) {
                $scope.selected = selectedItem;
               // console.log("Modal executed");
            }, function () {
               // console.log('Modal dismissed at: ' + new Date());
            });
        }

        eventService.retrieveAll().then(function(events) {
            //console.log("events retrieved: ", events);
            events.forEach(function(event) {
                var row = { 
                    type : event.eventType, 
                    date : moment(event.dateTime).format("dddd D MMMM YYYY à HH:mm"),
                    providers : event.providers,
                    params : eventService.parseParams(event.eventParams, event.eventType), 
                    id : event.eventId,
                    results : event.results,
                    error : event.error,
                    chainedEventsCounts : event.chainedEventsCounts
                };
                if(event.eventType === 'uploadVideo') {
                    row.attachment = {
                        originalFileName : event.eventParams[0].originalname,
                        size : event.eventParams[0].size
                    };
                }
                $scope.events.push(row);
                    
            });
            $scope.displayedCollection = [].concat($scope.events);
            //console.log("$scope.displayedCollection: ",$scope.displayedCollection );
        }, function(err) {
            alertsService.error("Impossible de récupérer les évènements enregistrés. Err: "+err);
        });
         
        $scope.executeAction = function(type, event) {
            console.log("executeAction with type: ",type);
            if(type==='message')
                $scope.addChainedEvent(event.id);
            else if(type==='uploadCloud')
                openModal('UploadCloud', event.id);
        };
        
        $scope.contextMenus = [
            { name : '-> Message', type : 'message', allowed : ['uploadVideo']},
            { name : '-> Copie cloud', type : 'uploadCloud', allowed : ['uploadVideo']}
        ];
        
        $scope.deleteEvent = function(event) {
            //console.log("delete event: ", event);
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
        
        $scope.modify = function(event) {
            //TODO
            //open modal popup with form data and save button
            if(event.type==='message') {
                $location.url('/postMessage?eventId='+event.id);
            }else if(event.type ==='uploadVideo') {
                $location.url('/uploadFile?eventId='+event.id);
            }
        };
        
    }]);
    
});