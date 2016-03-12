define(['../module'], function(appModule) {
    
    'use strict';
    
    appModule.controller('GoogleOptionsController', ['$scope', '$rootScope', 'eventService', 'alertsService', 
    function($scope,  $rootScope, eventService, alertsService) {
        
        if(!$rootScope.providersOptions)
            $rootScope.providersOptions = {};
        if(!$rootScope.selectedProvidersOptions)
            $rootScope.selectedProvidersOptions = {};
       
        if(!$rootScope.providersOptions.google) {             
        
            $rootScope.providersOptions.google = {
                privacyStatuses : ['private', 'public', 'unlisted']
            };
            
            eventService.getCategories('google').then(function(categories) {
                console.log("google categories: ", categories);
                $rootScope.providersOptions.google.categories=categories;            
            });
        } else {
            //reset choice ?
            // delete $rootScope.selectedProvidersOptions['google'];         
        }
    }]);
                                                          
});