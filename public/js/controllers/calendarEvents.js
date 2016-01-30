define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('CalendarEventsController',
    ['$scope', '$location', '$uibModal', 'eventService', 'alertsService', 
    function($scope,  $location, $uibModal, eventService, alertsService) {

        $scope.animationsEnabled = true;
        $scope.isCellOpen = true;
        $scope.calendarView = 'month';
        $scope.viewDate = new Date();
        $scope.calendarTitle = 'TEST';
        
        $scope.displayEvent = function(event) {
            
            console.log("open event ",event);
         
            $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'modalEvent.html',
                controller: 'EventModalController',
                size: 'lg',
                resolve: {
                    event : function() {
                        return event;
                    }
                }
            });  
        };
        
        $scope.calendars = [];
        
        $scope.loadDefaultCalendars = function() {
        
            //load google calendar:
            eventService.getCalendars('google').then(function(calendars) {
                console.log("calendars ", calendars);
                $scope.calendars = calendars;
                //TODO let user choose calendar(s)
                $scope.loadEvents();
            });
        };
        //load events, for a whle month
        $scope.loadEvents = function() {
            
            var limits=getLimits();
            $scope.events = [];
            
            getSocialEvents('facebook', limits);
            $scope.calendars.forEach(function(calendar) {
                //console.log("events for calendar: ", calendar.id);
                if(calendar.selected)
                    getSocialEvents('google', limits, calendar.id);
            });
        };
        
        function getLimits() {
            
            var limits = {
                since : null,
                until : null
            };
            switch($scope.calendarView) {
                case 'month':
                    limits.since = moment($scope.viewDate).set('date', 1).set('hour', 0).set('minute',0).set('second', 0);
                    limits.until = moment($scope.viewDate).add(1, 'months').set('date', 1).set('hour', 0).set('minute',0).set('second', 0);
                    break;
                case 'year':
                    console.log('view YEAR: viewDate', $scope.viewDate);
                    limits.since = moment($scope.viewDate).set('month', 0).set('date', 1).set('hour', 0).set('minute',0).set('second', 0);
                    limits.until = moment($scope.viewDate).set('month', 11).set('date', 31).set('hour', 23).set('minute',59).set('second', 59);
                    break;
                case 'week':
                    console.log('view WEEK: viewDate', $scope.viewDate);
                    limits.since = moment($scope.viewDate).weekday(0).set('hour', 0).set('minute',0).set('second', 0);
                    limits.until = moment($scope.viewDate).weekday(6).set('hour', 23).set('minute',59).set('second', 59);
                    break;
                case 'day':
                    console.log('view DAY: viewDate', $scope.viewDate);
                    limits.since = moment($scope.viewDate).set('hour', 0).set('minute',0).set('second', 0);
                    limits.until = moment($scope.viewDate).set('hour', 23).set('minute',59).set('second', 59);
                    break;
            }            
            console.log('limits: ', limits);
            return limits;
        }
                
        function getSocialEvents(provider, limits, calendarId) {    
            //console.log("view date? ", $scope.viewDate);
            
          /*  var since =  moment($scope.viewDate).set('date', 1).set('hour', 0).set('minute',0).set('second', 0);
            var timeSince = since.unix();
            var until = since.add(1, 'months').add(1, 'days'); */           
                       
            eventService.getSocialEvents(provider, limits.since.valueOf(), limits.until.valueOf(), calendarId).then(function(events) {
                console.log(provider+" events for current user: ", events);
                events.forEach(function(event) {
                    var eventSource = {
                        title: event.name,
                        description : event.description,
                        rsvp_status : event.rsvp_status,
                        draggable: false,
                        resizable: false,
                        editable : false,
                        deletable : false,
                        id : event.id,
                        provider : provider
                    };
                    if(event.start_time)
                        eventSource.startsAt = moment(event.start_time).toDate();
                    else if(event.start) {
                        //ALL DAY EVENT
                        eventSource.startsAt = new Date(event.start);
                        eventSource.allDay=true;
                        eventSource.endsAt = moment(eventSource.startsAt).set('hour', 23).set('minute',59).set('second', 59).toDate();
                    } else {
                        console.error("no start_time nor start attribute specified, event rejected: ", event);
                        return;
                    }
                    
                    switch(event.rsvp_status) {
                        case 'attending' :
                        case 'confirmed' :
                            eventSource.type = 'success';
                            break;                            
                        case 'declined' :
                            eventSource.type = 'inverse';
                            eventSource.incrementsBadgeTotal=false;
                            break;                            
                        case 'unsure' :
                        case 'tentative' :
                            eventSource.type = 'warning';
                            break;
                        
                    }
                    if(event.end_time)
                        eventSource.endsAt = moment(event.end_time).toDate();
                    addEvent(eventSource);
                });            
            }, function(err) {
                alertsService.error("Impossible de récupérer les évènements facebook. Err: "+err);
            });
        }
        
        function addEvent(event) {
          
            var exists = false;
            for(var i=0; i < $scope.events.length; i++ ) {
                if($scope.events[i].id === event.id) {
                    exists=true;
                    continue;
                }                
            }
            if(!exists)
                $scope.events.push(event);            
        }
                
        $scope.deleteEvent = function(/*event*/) {
            //console.log("delete event: ", event);
            //TODO open modal window with loading gif, and close it after
        /*    eventService.deleteFacebookEvent(event.id).then(function() {
                var index = $scope.events.indexOf(event);
                if (index !== -1) {
                    $scope.events.splice(index, 1);
                }
            }, function(err) {
                alertsService.error("Impossible d'effacer l'évènement. Err: "+err);
            });*/
        };
        
        $scope.modify = function(/*event*/) {
            //TODO
            //open modal popup with form data and save button
           /* if(event.type==='message') {
                $location.url('/postMessage?eventId='+event.id);
            }else if(event.type ==='uploadVideo') {
                $location.url('/uploadFile?eventId='+event.id);
            }*/
        };

    }])
    
    
    .controller('EventModalController', ['$scope', '$rootScope', '$location', '$uibModalInstance', 'event',
        function($scope, $rootScope, $location, $uibModalInstance, event) {
       
        $scope.modal = {
            event : event,
            ok : function() {
                $uibModalInstance.close();
            },
            cancel : function () {
                $uibModalInstance.dismiss('cancel');
            }
        };
    }]);
});