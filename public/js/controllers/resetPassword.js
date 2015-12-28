define(['./module', 'sha1'], function (appModule, sha1) {
    
    'use strict';
    
    appModule.controller(
        'ResetPasswordController',
        ['$scope', '$location', 'authService', 'alertsService',
        function($scope, $location, authService, alertsService) {

            $scope.form = {
                login : 'TEST',
                password : ''
            };
            
            $scope.form.resetPassword = function() {
                console.log("resetPassword");
                if ($scope.form.password !== '' && $scope.form.repeatedPassword!== '') {
                    if($scope.form.password !== $scope.form.repeatedPassword) {
                        alertsService.warn('Le mot de passe ne correspond pas');
                    } else {
                        //OK !
                        //authService.doSomething(sha1($scope.form.password))
                        console.log("ok");
                    }
                } else {
                    alertsService.warn('Veuillez renseigner tous les champs svp');
                }
            };
            
        }]
    );
    
});