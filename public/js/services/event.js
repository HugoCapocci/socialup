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
            
            this.retrieveTracedEvents = function() {
                return retrieveAllEvents('tracedEvents', localData.user.id);
            };
            
            this.retrieveChainedEvents = function(eventParentId) {
                return retrieveAllEvents('chainedEvents', eventParentId);
            };

            function retrieveAllEvents(eventCategory, id) {
                return getData('/'+eventCategory+'/'+id);
            }

            this.retrieveOne = function(eventId) {
                return getData('/event/'+eventId);
            };
            
            this.deleteScheduledEvent = function(eventId) {
                return deleteEvent('/event/'+eventId);
            };            
            this.deleteChainedEvent = function(eventId, eventParentId) {
                return deleteEvent('/event/chained/'+eventId+'/'+eventParentId);               
            };
            this.deleteTracedEvent = function(eventId) {
                return deleteEvent('/event/traced/'+eventId);               
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
            
            this.getCategories = function(provider) {
                return getData('/categories/'+provider+'/'+localData.user.id);
            };
            
            this.getFacebookGroups = function() {
                return getData('/facebookGroups/'+localData.user.id);
            };

            this.getFacebookPages = function() {                
                return getData('/facebookPages/'+localData.user.id);
            };
            
            function getData(path) {
                var deferred = $q.defer();
                $http.get(path)
                .then(function(response) {
                    //console.log('getData response: ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    //console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            }
            
            //TODO
            this.getPages = function(pageName) {
                var deferred = $q.defer();
                console.log("search page name: ", pageName);
                pageName = encodeURI(pageName);
                $http.get('/searchPage/facebook/'+pageName+'/'+localData.user.id).then(function(response) {
                    console.log('response for facebook searchPage: ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    //console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.getPageMetrics = function(pageId, dateSince, dateUntil) {
                var deferred = $q.defer();
                var url = '/pageMetrics/facebook/'+pageId+'/'+localData.user.id;
                if(dateSince && dateUntil)
                    url+='?since='+dateSince+"&until="+dateUntil;
                $http.get(url).then(function(response) {
                    console.log('response for facebook getPageMetrics: ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    //console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
        }]
    );
});