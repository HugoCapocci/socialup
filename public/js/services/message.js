define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('messageService',
        ['$http', '$q', '$window',
        function messageService($http, $q, $window) {
            
             var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
                        
            this.postMessage = function(providers, message, scheduledDate) {
                console.log("messageService.postMessage "+message);
                return sendMessage({message: message, providers: providers, scheduledDate:scheduledDate});
            };
            
            this.postChainedMessage = function(eventParentId, providers, chainedMessage, messageProvidersOptions) {
                console.log("messageService.postChainedMessage for eventParentId: ",eventParentId);
                return sendMessage({message: chainedMessage, providers: providers, eventParentId:eventParentId, messageProvidersOptions:messageProvidersOptions});
            };
            
            function sendMessage(messageObject) {
                var deferred = $q.defer();
                $http.post('/message/'+localData.user.id,  messageObject)
                .then(function(response) {
                    console.log('response for ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    //console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            }

        }]
    );
});