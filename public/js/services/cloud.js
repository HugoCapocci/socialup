define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('cloudService', 
        ['$http', '$q', '$window',
        function cloudService($http, $q, $window) {

            //authentication is made by provider callbacks
            this.getFolders = function (folderId) {

                var deferred = $q.defer();
                if(folderId===undefined)
                    folderId='root';
               
                $http.get('/cloudExplorer/'+folderId)
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