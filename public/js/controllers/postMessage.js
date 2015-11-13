define(['./module'], function (appModule) {
    
    'use strict';
    
    appModule.controller('PostMessageController', ['$scope', 'messageService', function($scope, messageService) {
        
        $scope.postMessage = {
            message : '',
            send : function() {
                console.log("message to send ? ", $scope.postMessage.message);
                
                if($scope.postMessage.message.length>0) {
                    messageService.postMessage(['twitter', 'facebook'], $scope.postMessage.message);
                } else
                    console.log("empty message :p");
            }
        };

    }]);
    
});