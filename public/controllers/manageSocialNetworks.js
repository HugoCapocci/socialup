define(['./module', 'moment'], function (appModule, moment) {
    
    'use strict';
    
    appModule.controller(
        'ManageSocialNetworksController',
        ['$scope', '$window', '$timeout', 'authService', 'userService', 'alertsService',
        function($scope, $window, $timeout, authService, userService, alertsService) {
            
            $scope.socialTokens = [];
            $scope.oauthURLS = {};
            //oauth providers url
            $scope.providers = ['dailymotion', 'google', 'facebook', 'dropbox', 'twitter', 'linkedin', 'vimeo', 'mixcloud', 'soundcloud'];
            
            var userData;
            userService.getData().then(function(data) {
                userData=data;
                Object.keys(userData.providers).map(function(provider/*, index*/) {

                    if(userData.providers[provider].tokens && userData.providers[provider].tokens.expiry_date !== undefined) {
                        userData.providers[provider].tokens.expiry_date=moment(userData.providers[provider].tokens.expiry_date).format("dddd D MMMM YYYY à HH:mm");
                    }
                });
                $scope.socialTokens= userData.providers;
                
                $scope.providers.forEach(function(provider) {
                    authService.getProviderURL(provider).then(function(url) {
                        $scope.oauthURLS[provider]=url;
                        //console.log("userData defined? ",userData);
                        if(userData !== undefined)
                            //workaround for mixcloud (doesn't store the state)
                            if(provider==='mixcloud')
                                $scope.oauthURLS[provider] += '?state='+userData.id;
                            else
                                $scope.oauthURLS[provider] += '&state='+userData.id;
                    });
                });
            });
            
            $scope.verifyTwitter = function() {
     
                var oauthVerifier = $scope.user.verificationCode;
                //console.log("oauthVerifier", oauthVerifier);                
                authService.getTwitterAccessToken(oauthVerifier).then(function(/*data*/) {
                    //console.log("verification OK, data? ", data);
                }, function(err) {
                    //console.log("verification KO, err? ", err);
                    alertsService.error("Erreur d'authentification twitter: "+err);
                });
            };
            
            $scope.deleteToken = function(provider) {
                authService.deleteToken(provider).then(function() {
                    alertsService.success("Jeton d'authentification pour le fournisseur "+provider+" supprimé");                    
                    userService.deleteToken(provider);
                     getUserData();
                }, function(err) {
                    console.log("delete token error: ", err);
                    alertsService.error("impossible d'effacer le jeton : "+err);
                });
            };
            
            $scope.generateToken = function(provider) {
                
                 authService.getProviderURL(provider).then(function(url) {
                    var oauthWindow = $window.open(url+'&state='+userData.id, 'C-Sharpcorner', 'width=600,height=500');
                    $timeout(function() {
                        refreshOnClose(oauthWindow);
                    }, 2000);
                 });                
            };

            $scope.refreshToken =function(provider) {
                authService.refreshToken(provider).then(function() {
                    $timeout(function( ) {
                         getUserData();
                    }, 1500);                    
                 });
            };

            function refreshOnClose(oauthWindow) {
               if(oauthWindow !== null && oauthWindow.closed) {
                    console.log("window is closed,  refresh");
                    getUserData();
                } else {
                    console.log('repeat, oauthWindow not null, closed? : ',oauthWindow.closed);
                    $timeout(function( ) {
                        refreshOnClose(oauthWindow);
                    }, 2000);
                }
            }
            
            function getUserData() {                
                userService.getData().then(function(data) {
                    userData=data;
                    console.log("userData.tokens founds: ", userData.tokens);
                    Object.keys(userData.providers).map(function(provider/*, index*/) {
                        console.log("provider: ", provider);
                        console.log("token: ", userData.providers[provider].tokens);
                        if(userData.providers[provider].tokens && userData.providers[provider].tokens.expiry_date !== undefined) {
                            console.log("token expiry_date found");
                            userData.providers[provider].tokens.expiry_date=moment(userData.providers[provider].tokens.expiry_date).format("dddd D MMMM YYYY à HH:mm");
                        }
                    });
                    $scope.socialTokens= userData.providers;
                });
            }

        }]
    );
});