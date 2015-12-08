define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('cloudService', 
        ['$http', '$q', '$window',
        function cloudService($http, $q, $window) {
            
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));

            //authentication is made by provider callbacks
            this.getFolders = function(provider, folderId, typeFilter) {

                var deferred = $q.defer();
                if(folderId===undefined)
                    folderId='root';
                
                if(provider==='dropbox') {
                    folderId = encodeURIComponent(folderId);
                    console.log("encoded path ", folderId);
                }
                var path = '/cloudExplorer/'+provider+'/'+folderId+'/'+localData.user.id;
                if(typeFilter)
                    path+='/?typeFilter='+typeFilter;
                $http.get(path).then(function(response) {
                    console.log('response for folderId '+folderId+': ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.uploadChained = function(provider, eventId, folderId) {
                var deferred = $q.defer();
                $http.post('/event/chained/'+provider+'/'+eventId+'/'+localData.user.id, {eventParams : [folderId], eventType: 'uploadCloud'}).then(function(response) {
                    console.log('response for folderId '+folderId+': ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
        }]
    );
});