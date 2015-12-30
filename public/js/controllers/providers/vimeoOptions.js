define(['../module'], function(appModule) {
    
    'use strict';
    
    appModule.controller('VimeoOptionsController', ['$scope', '$rootScope', 'eventService', 'alertsService', 
    function($scope,  $rootScope, eventService, alertsService) {
        
        if(!$rootScope.providersOptions)
            $rootScope.providersOptions = {};
        if(!$rootScope.selectedProvidersOptions)
            $rootScope.selectedProvidersOptions = {};
       
        if(!$rootScope.providersOptions.vimeo) {             
        
            $rootScope.providersOptions.vimeo = {
                privacyStatuses : ['anybody', 'nobody', 'contacts', 'disable'] //password
            };
            /*eventService.getCategories('google').then(function(categories) {            
                $rootScope.providersOptions.google.categories=categories;            
            });*/
        } else {
            //reset choice ?
            // delete $rootScope.selectedProvidersOptions['google'];         
        }
    }]);
                                                          
});