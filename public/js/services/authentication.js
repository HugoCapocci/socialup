define(['./module'], function(appModule) {

    'use strict';
    
    appModule.service('authService', 
        ['$rootScope', '$http', '$q', '$window',
        function($rootScope, $http, $q, $window) {

            //authentication is made by provider callbacks
            this.getProviderURL = function (provider) {

                var deferred = $q.defer();
                $http.get('/oauthURL/'+provider+'/'+$rootScope.user.id)
                .then(function(response) {
                    //console.log('response for provider '+provider+': ', response);
                    deferred.resolve(response.data);
                }, function(err) {
                    console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };

            this.authenticate = function(login, hashedPassword) {

                var deferred = $q.defer();
                $http.get('/authenticate/?login='+login+"&password="+hashedPassword)
                .then(function (response) {
                       
                    var userData = {
                        firstName :  response.data.firstName,
                        lastName :  response.data.lastName,
                        login :  response.data.login,
                        id : response.data._id,
                        providers : response.data.providers
                    };
                    //$window.localStorage.setItem('SocialUp', JSON.stringify({user: userData, timestamp : new Date().getTime()}));
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
                return $rootScope.tokens;
            };
            
            this.deleteToken = function(provider) {
                
                var deferred = $q.defer();
                $http.delete('/token/'+provider+'/'+$rootScope.user.id).then(function(response) {
                    console.log('response for eventService.deleteEvent: ', response);
                    deferred.resolve();
                }, function (err) {
                    console.log('err in eventService.deleteEvent: ', err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.refreshToken =function(provider) {
                
                var deferred = $q.defer();
                $http.get('/refreshToken/'+provider+'/'+$rootScope.user.id).then(function(response) {
                    console.log('response for eventService.refreshToken: ', response);
                    deferred.resolve();
                }, function (err) {
                    console.log('err in eventService.refreshToken: ', err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
       /*     this.getUserData = function() {
                
                var deferred = $q.defer();
                $http.get('/user/'+$rootScope.user.id).then(function (response) {
     
                    var userData = {
                        firstName :  response.data.firstName,
                        lastName :  response.data.lastName,
                        login :  response.data.login,
                        id : response.data._id,
                        providers : response.data.providers
                    };
                    $window.localStorage.setItem('SocialUp', JSON.stringify({user: userData, timestamp : new Date().getTime()}));
                    deferred.resolve(userData);
                }, function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;
            };*/
            
            this.resetPassword = function(userEmail) {
                
                var deferred = $q.defer();
                $http.post('/user/resetPassword/'+userEmail,{})
                .then(function(response) {
                    console.log('response for ', response);
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