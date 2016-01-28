define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('CalendarEventsController',
    ['$scope', '$location', '$uibModal', 'eventService', 'alertsService', 
    function($scope,  $location, $uibModal, eventService, alertsService) {

  /*      $scope.events = [
          {
            title: 'An event',
            type: 'warning',
            startsAt: moment().startOf('week').subtract(2, 'days').add(8, 'hours').toDate(),
            endsAt: moment().startOf('week').add(1, 'week').add(9, 'hours').toDate(),
            draggable: true,
            resizable: true
          }, {
            title: '<i class="glyphicon glyphicon-asterisk"></i> <span class="text-primary">Another event</span>, with a <i>html</i> title',
            type: 'info',
            startsAt: moment().subtract(1, 'day').toDate(),
            endsAt: moment().add(5, 'days').toDate(),
            draggable: true,
            resizable: true
          }, {
            title: 'This is a really long event title that occurs on every year',
            type: 'important',
            startsAt: moment().startOf('day').add(7, 'hours').toDate(),
            endsAt: moment().startOf('day').add(19, 'hours').toDate(),
            recursOn: 'year',
            draggable: true,
            resizable: true
          }
        ];*/
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
            
            getSocialEvents('facebook');
            $scope.calendars.forEach(function(calendar) {
                //console.log("events for calendar: ", calendar.id);
                getSocialEvents('google', calendar.id);
            });
                   
        };
        function getSocialEvents(provider, calendarId) {    
            //console.log("view date? ", $scope.viewDate);
            
            var since =  moment($scope.viewDate).set('date', 1).set('hour', 0).set('minute',0).set('second', 0);
            var timeSince = since.unix();
            var until = since.add(1, 'months').add(1, 'days');            
            //console.log("load events to "+until.toDate());
            
            eventService.getSocialEvents(provider, timeSince, until.unix(), calendarId).then(function(events) {
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
                        id : event.id                        
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