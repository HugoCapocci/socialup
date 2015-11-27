define(['./module'], function (appModule) {
    
    'use strict';
    
    appModule.controller(
        'MainController',
        ['$scope', '$location', '$window',
        function mainController($scope, $location, $window) {
            
            var parameters= $location.search();
            if(parameters.close)
                $window.close();
            $scope.value="Hello World!";

        }]
    );
});