define(['./module'], function (appModule) {

    'use strict';
    
    appModule.factory('$parentScope', function($window) {
        return $window.parent.angular.element($window.frameElement).scope();
    });

});