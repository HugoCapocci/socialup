define(['./module'], function(appModule) {

    'use strict';
    
    appModule.service('userService', 
        ['$rootScope', '$http', '$q', '$window', 
        function($rootScope, $http, $q, $window) {
            
            function getUserData() {
                var userData = $window.localStorage.getItem('SocialUp');
                if(userData)
                    return JSON.parse(userData).user;
                else
                    return undefined;
            }
            this.getUserData = function() {
                var userData = getUserData();
                $rootScope.user=userData;
                return userData;
            };
            
            function setUserData(userData) {
                 $window.localStorage.setItem('SocialUp', JSON.stringify({user: userData, timestamp : new Date().getTime()}));
            }
            
            this.getData = function() {
                
                var deferred = $q.defer();
                $http.get('/user/'+getUserData().id).then(function (response) {
     
                    var userData = {
                        firstName :  response.data.firstName,
                        lastName :  response.data.lastName,
                        login :  response.data.login,
                        id : response.data._id,
                        providers : response.data.providers
                    };
                    setUserData(userData);
                    $rootScope.user=userData;
                    deferred.resolve(userData);
                }, function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.setData = function(userData) {
                setUserData(userData);
                $rootScope.user=userData;
            };
    
            this.deleteData = function() {
                $window.localStorage.removeItem('SocialUp');
                delete $rootScope.user;
               // $location.path('/login');
            };
            
            this.getActiveProviders = function() {
                var userData = getUserData();
                console.log("Active providers: ",userData.providers);
                //var providers = [];
                Object.keys(userData.providers).map(function(provider) {
                   if(!userData.providers[provider].tokens)
                       delete userData.providers[provider];
                });
                return userData.providers;
            };

            this.deleteToken = function(provider) {
                var userData = getUserData();
                delete userData.providers[provider];
                console.log("delete provider "+provider+" in local data ", userData);
                setUserData(userData);
                $rootScope.user=userData;
            };
        }]
    );
});