define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('cloudService', 
        ['$http', '$q', '$window',
        function cloudService($http, $q, $window) {

            //authentication is made by provider callbacks
            this.getFolders = function(provider, folderId) {

                var deferred = $q.defer();
                if(folderId===undefined)
                    folderId='root';
                
                if(provider==='dropbox') {
                    folderId = encodeURIComponent(folderId);
                    console.log("encoded path ", folderId);
                }
                $http.get('/cloudExplorer/'+provider+'/'+folderId)
                .then(function(response) {
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