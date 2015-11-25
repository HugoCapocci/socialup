define(['./module'], function (appModule) {
    
    'use strict';
    
    appModule.controller(
        'MainController',
        ['$scope', '$window', 'authService',
        function mainController($scope, $window, authService) {
        
            $scope.value="Hello World!";
            $scope.user = {
                id : 'test'
            };
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

        }]
    );
});