define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('videosService',
        ['$http', '$q', '$window',
        function($http, $q, $window) {
            
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
            
            this.getMedia = function(provider) {

                var deferred = $q.defer();               
                $http.get('/media/'+provider+'/'+localData.user.id)
                .then(function(response) {
                    console.log('getMedia response data: ', response.data);
                    deferred.resolve(response.data);
                }, function (err) {
                    //console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.searchVideo = function(provider, videoName, order) {

                var deferred = $q.defer();      
                var url = 'search/video/'+provider+'?videoName='+encodeURI(videoName);
                if(order)
                    url += "&order="+order;
                $http.get(url)
                .then(function(response) {
                    console.log('searchVideo response data for provider '+provider+': ', response.data);
                    deferred.resolve(response.data);
                }, function (err) {
                    console.error("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };

        }]
    );
});