define(['./module'], function (appModule) {
    
    'use strict';
    
    appModule.controller(
        'ManageSocialNetworksController',
        ['$scope', '$window', 'authService',
        function manageSocialNetworksController($scope, $window, authService) {
        
            $scope.socialTokens = authService.getUserTokens();

            $scope.oauthURLS = {};
            
            //authenticate user
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
            console.log("localData found? ",localData);            

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
                console.log("oauthVerifier", oauthVerifier);                
                authService.getTwitterAccessToken(oauthVerifier).then(function(data) {
                    console.log("verification OK, data? ", data);
                }, function(err) {
                     console.log("verification KO, err? ", err);
                });
            };
            
            $scope.deleteToken = function(provider) {
                authService.deleteToken(provider).then(function() {
                    getUserData();
                }, function(err) {
                    console.log("delete token error: ", err);
                });
            };
            
            $scope.generateToken = function(provider) {
                
                 authService.getProviderURL(provider).then(function(url) {
                     var oauthWindow = $window.open(url+'&state='+localData.user.id, 'C-Sharpcorner', 'width=500,height=400');
                     //oauthWindow.onload = function() {
                        oauthWindow.onbeforeunload = function() {
                            console.log("token generated");
                            getUserData();
                        };
                    //};
                 });
                
            };
            
            function getUserData() {                
                authService.getUserData().then(function(userData) {
                    $scope.socialTokens=userData.tokens;
                });
            }

        }]
    );
});