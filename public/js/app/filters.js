define(['angular','moment'], function(angular, moment) {

    'use strict';
      
    angular.module('SocialUp.filters', [])  
    .filter('formatNumber', [function () {
                
        return function(number, decimals) {
            
            number = parseFloat(number);
            if(isNaN(number))
                return '-';
            if(number<1000) {
                return number;
            } else {
                var numberInKilos = number/1000;
                if(numberInKilos<1000) {
                    return formatValue(numberInKilos)+'k';
                } else {
                    var numberInMillions = numberInKilos/1000;
                    if(numberInMillions<1000) {
                        return formatValue(numberInMillions)+'M';
                    } else {
                        return formatValue(numberInMillions/1000)+' Md';
                    }
                }
            }

            function formatValue(value) {
                if(!decimals)
                    return parseInt(value);
                else
                    return value.toFixed(decimals);
            }
        };        
        
    }])
    
    .filter('formatFileSize', [function () {
    
        return function(sizeInBytes) {            
            var sizeInKiloBytes = sizeInBytes/1024;
            if(sizeInKiloBytes<1) {
                return sizeInBytes+" o";           
            } else {                
                var sizeInMegaBytes = sizeInKiloBytes/1024;                
                if(sizeInMegaBytes<1) {
                     return Number(sizeInKiloBytes).toFixed(2)+" ko";
                } else {
                    var sizeInGigaBytes = sizeInMegaBytes/1024;                    
                    return Number(sizeInMegaBytes).toFixed(2) + (sizeInGigaBytes<1 ? " Mo": " Go");
                }
            }
        };
    }])
    
    .filter('formatDurationInSeconds', [function() {

        return function(durationInSeconds) {            
           var format = durationInSeconds>=3600 ? "HH[h]mm:ss" : "mm:ss";
            return moment(durationInSeconds*1000).format(format);
        };
    }])
       
    .filter('formatDate', [function() {

        return function(date) {            
            var time = Date.now() - new Date(date).getTime();
            return moment.duration(time).humanize();
        };
    }]);
    
});