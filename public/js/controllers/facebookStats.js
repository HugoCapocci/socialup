define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
        
    appModule.controller('FacebookStatsController', ['$scope', '$rootScope', '$location', 'eventService', 'alertsService', 
    function($scope, $rootScope, $location, eventService, alertsService) {
        
        
        $scope.facebookPages = [];
        $scope.displayedCollection = [].concat($scope.facebookPages);
        $scope.itemsByPage = 5;
        $scope.searchFacebookPage = function() {
            eventService.getPages($scope.pageName).then(function(pages){
                console.log("pages: ", pages);
                $scope.facebookPages=pages.data;
                $scope.displayedCollection = [].concat($scope.facebookPages);
            });
        };
        
        //select a page
        $scope.setSelected = function($index) {
            $scope.selectedPage = $scope.facebookPages[$index];
        };
        
        $scope.stats = {};
        
        $scope.getPageStats = function() {
            
            if(!$scope.stats.dateSince || !$scope.stats.dateUntil) {
                alertsService.warn("Veuillez choisir une date de début ET une date de fin svp");
                return;
            }
            //console.log("stats du "+$scope.stats.dateSince.getTime()+ " au "+$scope.stats.dateUntil.getTime());
            
            eventService.getPageMetrics($scope.selectedPage.id, $scope.stats.dateSince.getTime()/1000, $scope.stats.dateUntil.getTime()/1000).then(function(metrics){
                console.log("metrics: ", metrics.data);
                
                var valuesByDay = metrics.data[0].values; //end_time, value{}
                $scope.labels=[];
                $scope.series = ['Likes'/*, 'BE'*/];
                $scope.data = [[]/*,[]*/];
                valuesByDay.forEach(function(dayValue) {
                    //console.log("dayValue: ", dayValue);
                    $scope.labels.push(moment(dayValue.end_time).format('D MMM YYYY'));
                    //$scope.data[0].push(dayValue.value.FR);
                    var likes = 0;
                    for(var country in dayValue.value){
                        likes+=dayValue.value[country];
                    }
                    $scope.data[0].push(likes);
                   // $scope.data[1].push(dayValue.value.BE);
                });
                
                console.log("$scope.data: ", $scope.data);
            });
            
        };
        
        $scope.format = 'dd MMMM yyyy';
        $scope.status = {
            since : false,
            until: false
        };
        
        $scope.maxDate = moment().hours(0).minutes(0).seconds(0);
        $scope.minDate= moment().subtract(1,'months').hours(0).minutes(0).seconds(0);
        
        $scope.open = function(type/*$event*/) {
            $scope.status[type] = true;
        };
        
        //disable future dates
        $scope.disabled = function(date) {
            return date.getTime() > Date.now();
        };
        
        
        //charts for data
/*        $scope.labels = ["January", "February", "March", "April", "May", "June", "July"];
        $scope.series = ['Series A', 'Series B'];
        $scope.data = [
            [65, 59, 80, 81, 56, 55, 40],
            [28, 48, 40, 19, 86, 27, 90]
        ];*/

        $scope.onClick = function (points, evt) {
            console.log(points, evt);
        };
        
    }]);
    
});