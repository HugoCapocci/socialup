define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('authService', 
        ['$http', '$q', '$window',
        function authService($http, $q, $window) {

            //authentication is made by provider callbacks
            this.getProviderURL = function (provider) {

                var deferred = $q.defer();
                $http.get('/oauthURL/'+provider)
                .then(function (response) {
                    console.log('response for provider '+provider+': ', response);
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