define(['./module', 'sha1'], function (appModule, sha1) {
    
    'use strict';
    
    appModule.controller(
        'LoginController',
        ['$scope', '$location', 'authService',
        function loginController($scope, $location, authService) {

            $scope.errorMessage = '';
            $scope.form = {
                login : '',
                password : '',
                firstName :'',
                lastName : ''
            };
            $scope.isSocialNetworkAuthenticated=false;

            // authentification via réseaux sociaux
           /* $scope.socialConnect = function (socialName) {
                OAuth.initialize('zmaSZDgNCz7wCTfThCXiBhCuHKI')
                OAuth.popup(socialName).done(function (result) {
                    console.log('facebook oauth OK');
                    result.me()
                    .done(function (user_info) {
                        console.log('user infos:');
                        console.log(user_info);
                        // TODO improve $location use : add # ton base url ?
                        var port = $location.port();
                        window.location = "//"+$location.host() + (port != 80 ? ':'+ port:'') + '#/results';
                        //$location.path('/details/');
                        //console.log("$location.url() ", $location.url());
                    })
                    .fail(function (error) {
                        console.log('error when trying to retrieve user infos:');
                        console.log(error);
                    });
                });
            };*/
            
            /*$scope.socialSubscribe = function (socialName) {
                
                // OAUTHIO_PUBLIC_KEY 'zmaSZDgNCz7wCTfThCXiBhCuHKI'
                OAuth.initialize('zmaSZDgNCz7wCTfThCXiBhCuHKI')
                OAuth.popup(socialName).done(function (result) {
                    console.log(socialName+' subscribe OK');
                    result.me()
                    .done(function (userInfo) {
                        console.log('user infos:', userInfo);
                        
                        $scope.$apply(function() {
                            $scope.isSocialNetworkAuthenticated=true;
                        
                            $scope.form.firstName = userInfo.firstname;
                            $scope.form.lastName = userInfo.lastname || userInfo.name;
                            
                            if(userInfo.email!==undefined)
                                 $scope.form.email = userInfo.email;
                            
                            $scope.socialAuth = {
                                name : socialName,
                                userId : userInfo.id
                            }
                        });
                    })
                    .fail(function (error) {
                        console.log('error when trying to retrieve user infos:');
                        console.log(error);
                    });
                });
                
            };*/

            $scope.authenticate = function () {
                console.log('login: ', $scope.form.login);
                console.log('password: ', sha1($scope.form.password) );
               
                if ($scope.form.login !== '' && $scope.form.password !== '') {
                    
                     // service d'authentification
                    authService.authenticate($scope.form.login, sha1($scope.form.password) )
                    .then(function(userData) {
                        $scope.user = userData;
                        $scope.errorMessage = '';          
                         console.log("user logged: ", userData);
                      /*  var port = $location.port();
                        window.location = "//" + $location.host() + (port != 80 ? ':' + port : ''); */                  
                    }, function(err) {
                        $scope.errorMessage = 'Erreur dans le service d\'authentification: '+ err;
                    });
                    
                } else {
                    $scope.form = {
                        login: '',
                        password: ''
                    };
                    $scope.errorMessage = 'login / mot de passe incorrect';
                }
            };

            $scope.create = function() {
              
                if ($scope.form.login !== '' && $scope.form.password !== '' && $scope.form.firstName !== '' && $scope.form.lastName !== '' && $scope.form.repeatedPassword!== '') {
                    
                    if($scope.form.password !== $scope.form.repeatedPassword) {
                        $scope.errorMessage = 'Le mot de passe ne correspond pas';
                    } else {
                    
                        authService.createUser($scope.form.firstName, $scope.form.lastName, $scope.form.login, sha1($scope.form.password)).then(function(userData) {
                            $scope.user = userData;
                            $scope.errorMessage = '';
                            console.log("user created: ", userData);
                            //var port = $location.port();
                            //window.location = "//" + $location.host() + (port != 80 ? ':' + port : '');                   
                        }, function(err) {
                            $scope.errorMessage = 'Erreur dans le service d\'authentification: '+ err;
                        });
                    }
                } else {
                     $scope.errorMessage = 'Tous les champs doivent être remplis';
                }
            };
        }]
    );
});