define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('eventService', 
        ['$http', '$q', '$window',
        function eventService($http, $q, $window) {
            
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
            console.log('localData: ', localData);
            
            this.retrieveAll = function() {

                var deferred = $q.defer();
                $http.get('/events/'+localData.user.id).then(function(response) {
                    console.log('response for eventService.retrieveAll: ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    console.log('err in eventService.retrieveAll: ', err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };

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
            
            this.deleteEvent = function(eventId) {
                
                var deferred = $q.defer();
                $http.delete('/event/'+eventId).then(function(response) {
                    console.log('response for eventService.deleteEvent: ', response);
                    deferred.resolve();
                }, function (err) {
                    console.log('err in eventService.deleteEvent: ', err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
        }
        ]
    );
});