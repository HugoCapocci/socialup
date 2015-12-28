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
                    //console.log('getData response: ', response);
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