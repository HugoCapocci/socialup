define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('messageService', 
        ['$http', '$q',
        function messageService($http, $q) {
                        
            this.postMessage = function(providers, message, scheduledDate) {
                
                var deferred = $q.defer();
                console.log("messageService.postMessage "+message);
                
                //$http.post()
                $http.post('/message', 
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
        }
        ]
    );
});