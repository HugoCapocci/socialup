define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('alertsService', 
        ['$rootScope', '$timeout', 
        function alertsService($rootScope, $timeout) {

            //authentication is made by provider callbacks
            this.success = function(message, delay) {
                createAlert(message, 'success', delay);
            };
            
            this.error = function(message, delay) {
                createAlert(message, 'danger', delay);
             };
            
            this.info = function(message, delay) {
                createAlert(message, 'info', delay);
            };
            
            this.warn = function(message, delay) {
                  createAlert(message, 'warning', delay);
            };
            
            function createAlert(message, type, delay) {
                if(delay===undefined)
                    delay=2000;
                $rootScope.alert = {
                    msg : message,
                    type : type,
                    opacity : 1
                };
                $timeout(deleteAlert, delay);
            }
            
            function deleteAlert() {
                if($rootScope.alert!==undefined) {                    
                    if($rootScope.alert.opacity < 0.1)
                        delete $rootScope.alert;
                    else {
                        $rootScope.alert.opacity=0.9*$rootScope.alert.opacity;
                        $timeout(deleteAlert, 100);
                    }                    
                }
            }
        }]
    );
});