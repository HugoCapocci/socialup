define(['../module'], function(appModule) {
    
    'use strict';
    
    appModule.controller('DailymotionOptionsController', ['$scope', '$rootScope', 'eventService', 'alertsService', 
    function($scope,  $rootScope, eventService, alertsService) {
        
        if(!$rootScope.providersOptions)
             $rootScope.providersOptions = {};
        if(!$rootScope.selectedProvidersOptions)
            $rootScope.selectedProvidersOptions = {};
       
        if(!$rootScope.providersOptions.dailymotion) {
            
            console.log("DailymotionOptionsController refresh data");
            $rootScope.providersOptions.dailymotion = {};
            eventService.getCategories('dailymotion').then(function(categories) {     
                console.log("dailymotion channels: ", categories);
                $rootScope.providersOptions.dailymotion.channels=categories;            
            });            
        }

    }]);

});