define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('eventService', 
        ['$http', '$q', '$window',
        function eventService($http, $q, $window) {
            
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
            console.log('localData: ', localData);
            
            this.retrieveAll = function() {
                return retrieveAllEvents('events', localData.user.id);
            };
            
            this.retrieveChainedEvents = function(eventParentId) {
                return retrieveAllEvents('chainedEvents', eventParentId);
            };

            function retrieveAllEvents(eventCategory, id) {

                var deferred = $q.defer();
                $http.get('/'+eventCategory+'/'+id).then(function(response) {
                    console.log('response for eventService.retrieveAll: ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    console.log('err in eventService.retrieveAll: ', err);
                    deferred.reject(err);
                });
                return deferred.promise;
            }

            this.retrieveOne = function(eventId) {

                var deferred = $q.defer();
                $http.get('/event/'+eventId).then(function(response) {
                    console.log('response for eventService.retrieveOne: ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    console.log('err in eventService.retrieveOne: ', err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.deleteScheduledEvent = function(eventId) {
                return deleteEvent('/event/'+eventId);
            };            
            this.deleteChainedEvent = function(eventId, eventParentId) {
                return deleteEvent('/event/chained/'+eventId+'/'+eventParentId);               
            }; 
            function deleteEvent(ressource) {
                
                var deferred = $q.defer();
                $http.delete(ressource).then(function(response) {
                    console.log('response for eventService.deleteEvent: ', response);
                    deferred.resolve();
                }, function (err) {
                    console.log('err in eventService.deleteEvent: ', err);
                    deferred.reject(err);
                });
                return deferred.promise;
            }
            
            this.parseParams = function(params, eventType) {
              
                var parsedParams = [];
                switch(eventType) {
                    case 'message' :                    
                        parsedParams.push({
                            name : 'message',
                            value : params[0]
                        });
                        break;
                    case 'uploadVideo' :
                        parsedParams.push({
                            name : 'titre',
                            value : params[1]
                        });
                        parsedParams.push({
                            name : 'description',
                            value : params[2]
                        });
                        if(params[3])
                            parsedParams.push({
                                name : 'tags',
                                value : params[3].toString()
                            });
                        break;
                    case 'uploadCloud' :
                        parsedParams.push({
                            name : 'targertFolder',
                            value : params[0].toString()
                        });
                        break;
                }
                //console.log('parsedParams: ' , parsedParams);                
                return parsedParams;
            };
            
            this.updateScheduledEvent = function(eventId, scheduledEvent) {
                var deferred = $q.defer();
                $http.post('/event/'+eventId, scheduledEvent)
                .then(function(response) {
                    console.log('response for ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    //console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
        }
        ]
    );
});