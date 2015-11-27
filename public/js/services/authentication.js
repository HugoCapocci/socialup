define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('authService', 
        ['$http', '$q', '$window',
        function authService($http, $q, $window) {

            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));

            //authentication is made by provider callbacks
            this.getProviderURL = function (provider) {

                var deferred = $q.defer();
                $http.get('/oauthURL/'+provider+'/'+localData.user.id)
                .then(function(response) {
                    
                    console.log('response for provider '+provider+': ', response);
                    deferred.resolve(response.data);
                }, function(err) {
                    
                    console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
        
            this.getTwitterAccessToken = function(oauthVerifier) {
                var deferred = $q.defer();
                $http.post('/twitter/'+oauthVerifier+'/'+localData.user.id)
                .then(function (response) {
                    console.log('response for getTwitterAccessToken: ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    
                    console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };

            this.authenticate = function(login, hashedPassword) {

                var deferred = $q.defer();
                $http.get('/user/authenticate/?login='+login+"&password="+hashedPassword)
                .then(function (response) {
                    
                    console.log("authenticated user data: ", response.data);       
                    var userData = {
                        firstName :  response.data.firstName,
                        lastName :  response.data.lastName,
                        login :  response.data.login,
                        id : response.data._id,
                        tokens : response.data.tokens
                    };
                    $window.localStorage.setItem('SocialUp', JSON.stringify({user: userData, timestamp : new Date().getTime()}));
                    deferred.resolve(userData);
                }, function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;                
            };
            
            this.createUser = function(firstName, lastName, login, hashedPassword) {

                var deferred = $q.defer();
                
                $http.post('/user/create', 
                    {firstName: firstName, lastName: lastName, login:login, password:hashedPassword})
                .then(function(response) {
                    console.log('response for ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.getUserTokens = function() {
                return localData.user.tokens;
            };
            
            this.deleteToken = function(provider) {
                
                var deferred = $q.defer();
                $http.delete('/token/'+provider+'/'+localData.user.id).then(function(response) {
                    console.log('response for eventService.deleteEvent: ', response);
                    deferred.resolve();
                }, function (err) {
                    console.log('err in eventService.deleteEvent: ', err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.getUserData = function() {
                
                var deferred = $q.defer();
                $http.get('/user/'+localData.user.id).then(function (response) {
                    
                    console.log("authenticated user data: ", response.data);       
                    var userData = {
                        firstName :  response.data.firstName,
                        lastName :  response.data.lastName,
                        login :  response.data.login,
                        id : response.data._id,
                        tokens : response.data.tokens
                    };
                    $window.localStorage.setItem('SocialUp', JSON.stringify({user: userData, timestamp : new Date().getTime()}));
                    deferred.resolve(userData);
                }, function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;
            };

        }]
    );
});