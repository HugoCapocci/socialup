define(['./module', 'sha1'], function(appModule, sha1) {
    
    'use strict';
    
    appModule.controller(
        'LoginController',
        ['$scope', '$location', 'authService', 'alertsService', 'userService',
        function($scope, $location, authService, alertsService, userService) {
            
            console.log('trying to instanciate LoginController');

            $scope.form = {
                login : '',
                password : '',
                firstName :'',
                lastName : ''
            };

            $scope.authenticate = function () {

                if ($scope.form.login !== '' && $scope.form.password !== '') {

                     // service d'authentification
                    authService.authenticate($scope.form.login, sha1($scope.form.password) )
                    .then(function(userData) {
                        console.log("authentication userData ", userData);
                        userService.setData(userData);
                        alertsService.success('Authentification ok');
                        $location.path("/");
                    }, function(err) {
                        alertsService.error('Erreur dans le service d\'authentification: '+err);
                    });
                    
                } else {
                    $scope.form = {
                        login: '',
                        password: ''
                    };
                    alertsService.warn('Veuillez renseigner tous les champs ');
                }
            };

            $scope.create = function() {
              
                if ($scope.form.login !== '' && $scope.form.password !== '' && $scope.form.firstName !== '' && $scope.form.lastName !== '' && $scope.form.repeatedPassword!== '') {
                
                    if($scope.form.password !== $scope.form.repeatedPassword) {
                        alertsService.warn('Le mot de passe ne correspond pas');
                    } else {
    
                        authService.createUser($scope.form.firstName, $scope.form.lastName, $scope.form.login, sha1($scope.form.password)).then(function(userData) {
                            $scope.user = userData;
                            alertsService.success("Utilisateur enregistré");
                            console.log("user created: ", userData);
                            userService.setData(userData);
                            $location.path("/");
                            
                        }, function(err) {
                            alertsService.error('Erreur dans le service d\'authentification: '+err);
                        });
                    }
                } else {
                     alertsService.warn('Veuillez renseigner tous les champs ');
                }
            };
            
            $scope.sendResetPassword = function() {

                console.log("sendResetPassword");                
                if($scope.form.loginPasswordRetrieve !== '')                
                    authService.resetPassword($scope.form.loginPasswordRetrieve).then(function(userData) {
                        alertsService.success("Un email vous a été envoyé pour réinitialiser votre mot de passe");
                    }, function(err) {
                        alertsService.error('Erreur dans le service de réinitialisation du mot de passe: '+err);
                    });
                else 
                     alertsService.warn('Veuillez renseigner votre email');
            };
        
        }]
    );
});