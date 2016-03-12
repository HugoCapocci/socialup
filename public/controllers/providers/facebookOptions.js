define(['../module'], function(appModule) {
    
    'use strict';
    
    appModule.controller('FacebookOptionsController', ['$scope', '$rootScope', 'eventService', 'alertsService', 
    function($scope,  $rootScope, eventService, alertsService) {
        
        if(!$rootScope.providersOptions)
             $rootScope.providersOptions = {};
        if(!$rootScope.selectedProvidersOptions)
            $rootScope.selectedProvidersOptions = {};
       
        if(!$rootScope.selectedProvidersOptions.facebook) {
            
             console.log("FacebookOptionsController refresh ata");
            
            $rootScope.providersOptions.facebook = {
                visibilities : ['EVERYONE', 'ALL_FRIENDS', 'FRIENDS_OF_FRIENDS', /*'CUSTOM', */'SELF']
            };
            $rootScope.selectedProvidersOptions.facebook = {
                visibility : 'SELF'
            };

            eventService.getFacebookGroups().then(function(groups) {     
                console.log("facebook groups: ", groups);
                $rootScope.providersOptions.facebook.groups=groups;            
            });

            eventService.getFacebookPages().then(function(pages) {     
                console.log("facebook pages: ", pages);
                $rootScope.providersOptions.facebook.pages=pages;            
            });
        }

    }]);

});