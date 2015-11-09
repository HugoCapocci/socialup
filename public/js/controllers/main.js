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

            //oauth providers url
            $scope.providers = ['dailymotion', 'youtube', 'facebook', 'dropbox', 'twitter'];
            
            $scope.providers.forEach(function(provider) {
                authService.getProviderURL(provider).then(function(url) {
                    console.log(provider+' url: ',url);
                    $scope.oauthURLS[provider]=url+'&state=user';
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