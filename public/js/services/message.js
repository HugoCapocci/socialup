define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('messageService',
        ['$http', '$q', '$window',
        function messageService($http, $q, $window) {
            
             var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
                        
            this.postMessage = function(providers, message, scheduledDate) {
                
                var deferred = $q.defer();
                console.log("messageService.postMessage "+message);
                
                //$http.post()
                $http.post('/message/'+localData.user.id, 
                    {message: message, providers: providers, scheduledDate:scheduledDate})
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