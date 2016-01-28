define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('calendarService', 
        ['$http', '$q', '$window',
        function ($http, $q, $window) {
            
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
            
        }]
     );
    
});