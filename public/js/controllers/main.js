define(['./module'], function (appModule) {
    
    'use strict';
    
    appModule.controller(
        'MainController',
        ['$scope', '$window', 'authService',
        function mainController($scope, $window, authService) {
        
            $scope.value="Hello World!";

        }]
    );
});