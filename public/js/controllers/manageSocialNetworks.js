define(['./module', 'moment'], function (appModule, moment) {
    
    'use strict';
    
    appModule.controller(
        'ManageSocialNetworksController',
        ['$scope', '$window', '$timeout', 'authService', 'alertsService',
        function($scope, $window, $timeout, authService, alertsService) {
        
            $scope.socialTokens = [];
            authService.getUserData().then(function(userData) {
                //console.log("userData.providers founds: ", userData.providers);
                Object.keys(userData.providers).map(function(provider/*, index*/) {
                   // console.log("provider: ", provider);
                    //console.log("token: ", userData.providers[provider].tokens);
                    if(userData.providers[provider].tokens && userData.providers[provider].tokens.expiry_date !== undefined) {
                       // console.log("token expiry_date found");
                        userData.providers[provider].tokens.expiry_date=moment(userData.providers[provider].tokens.expiry_date).format("dddd D MMMM YYYY à HH:mm");
                    }
                });
                $scope.socialTokens= userData.providers;
            });

            $scope.oauthURLS = {};
            
            //authenticate user
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
            //console.log("localData found? ",localData);            

            //oauth providers url
            $scope.providers = ['dailymotion', 'google', 'facebook', 'dropbox', 'twitter', 'linkedin'];

            $scope.providers.forEach(function(provider) {
                authService.getProviderURL(provider).then(function(url) {
                    $scope.oauthURLS[provider]=url;
                    if(localData !== undefined &&localData.user !== undefined)
                        $scope.oauthURLS[provider] += '&state='+localData.user.id;
                });
            });
            
            $scope.verifyTwitter = function() {
     
                var oauthVerifier = $scope.user.verificationCode;
                //console.log("oauthVerifier", oauthVerifier);                
                authService.getTwitterAccessToken(oauthVerifier).then(function(data) {
                    //console.log("verification OK, data? ", data);
                }, function(err) {
                     //console.log("verification KO, err? ", err);
                    alertsService.error("Erreur d'authentification twitter: "+err);
                });
            };
            
            $scope.deleteToken = function(provider) {
                authService.deleteToken(provider).then(function() {
                    alertsService.success("Jeton d'authentification pour le fournisseur "+provider+" supprimé");
                    getUserData();
                }, function(err) {
                    console.log("delete token error: ", err);
                });
            };
            
            $scope.generateToken = function(provider) {
                
                 authService.getProviderURL(provider).then(function(url) {
                    var oauthWindow = $window.open(url+'&state='+localData.user.id, 'C-Sharpcorner', 'width=600,height=500');
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
                authService.getUserData().then(function(userData) {
                    console.log("userData.tokens founds: ", userData.tokens);
                    Object.keys(userData.providers).map(function(provider/*, index*/) {
                        console.log("provider: ", provider);
                        console.log("token: ", userData.providers[provider].tokens);
                        if(userData.providers[provider].tokens.expiry_date !== undefined) {
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