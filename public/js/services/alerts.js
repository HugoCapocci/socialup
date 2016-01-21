define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('alertsService', 
        ['$rootScope', '$timeout', 
        function ($rootScope, $timeout) {
            
            if(!$rootScope.alerts)
                $rootScope.alerts = [];

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
                
                var alert = {
                    msg : message,
                    type : type,
                    opacity : 1
                };
                var index = getIndex(alert);
                if(index===-1)
                    $rootScope.alerts.push(alert);
                else {
                    $rootScope.alerts[index].opacity=1;                    
                }
                $timeout(function() {
                    deleteAlert(alert);
                }, delay);
            }
            
            function deleteAlert(alert) {
                
                var index = getIndex(alert);
                if(index===-1)
                    return;

                if($rootScope.alerts!==undefined && $rootScope.alerts[index] !== undefined) {                    
                    if($rootScope.alerts[index].opacity < 0.1) {                       
                        $rootScope.alerts.splice(index, 1);                      
                    } else {
                        $rootScope.alerts[index].opacity=0.9*$rootScope.alerts[index].opacity;
                        $timeout(function() {
                            deleteAlert(alert);
                        }, 100);
                    }                    
                }
            }
            
            function getIndex(alert) {
                if(!$rootScope.alerts || $rootScope.alerts.length===0)
                    return -1;
                else {
                    var index = -1;
                    for(var i =0; i<$rootScope.alerts.length; i++) {
                        if($rootScope.alerts[i].msg === alert.msg && $rootScope.alerts[i].type === alert.type) {
                            index = i;
                            continue;
                        }
                    }
                    return index;
                }
            }
        }]
    );
});