define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('videosService',
        ['$http', '$q', '$window',
        function($http, $q, $window) {
            
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
                        
            this.getVideos = function(provider) {

                var deferred = $q.defer();               
                $http.get('/videos/'+provider+'/'+localData.user.id)
                .then(function(response) {
                    //console.log('getVideos response: ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    //console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.getMedia = function(provider) {

                var deferred = $q.defer();               
                $http.get('/media/'+provider+'/'+localData.user.id)
                .then(function(response) {
                    console.log('getMusics response data: ', response.data);
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