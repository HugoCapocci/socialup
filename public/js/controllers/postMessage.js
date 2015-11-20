define(['./module'], function (appModule) {
    
    'use strict';
    
    appModule.controller('PostMessageController', ['$scope', 'messageService', function($scope, messageService) {
        
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        var afterTomorrow = new Date();
        afterTomorrow.setDate(tomorrow.getDate() + 2);
        var events = [
          {
            date: tomorrow,
            status: 'full'
          },
          {
            date: afterTomorrow,
            status: 'partially'
          }
        ];
        
        $scope.dateOptions = {
            formatYear: 'yy',
            startingDay: 1
        };
 
        $scope.format = 'dd-MMMM-yyyy';
        $scope.status = {
            opened: false
        };
        
        $scope.postMessage = {
            message : '',
            date : new Date(),
            send : function() {
                console.log("message to send ? ", $scope.postMessage.message);
                
                if($scope.postMessage.message.length>0) {
                    messageService.postMessage(['twitter', 'facebook'], $scope.postMessage.message, $scope.postMessage.date);
                } else
                    console.log("empty message :p");
            },
            getDayClass : function(date) {
                
                var dayToCheck = new Date(date).setHours(0,0,0,0);
                
                for (var i=0;i<events.length;i++) {
                    var currentDay = new Date(events[i].date).setHours(0,0,0,0);
                    if (dayToCheck === currentDay) {
                        return events[i].status;
                    }
                }
                return '';
            }           
        };
        
        $scope.clear = function () {
            $scope.postMessage.date = null;
        };

        // Disable weekend selection
        $scope.disabled = function(date) {
            return ( date.getDay() === 0 || date.getDay() === 6 );
        };

        $scope.toggleMin = function() {
            $scope.minDate = $scope.minDate ? null : new Date();
        };
        $scope.toggleMin();
        $scope.maxDate = new Date(2020, 5, 22);

        $scope.open = function($event) {
            console.log('open event: ', $event);
            $scope.status.opened = true;
        };

        $scope.setDate = function(year, month, day) {
            $scope.postMessage.date = new Date(year, month, day);
        };
        
        //timepicker
        $scope.hstep = 1;         
        $scope.mstep = 5;
       /* $scope.options = {
            hstep: [1, 2, 3],
            mstep: [1, 5, 10, 15, 25, 30]
        };*/
        $scope.ismeridian = false;
        $scope.postMessage.date.setHours(14);
        $scope.postMessage.date.setMinutes(0);       
        $scope.changed = function () {
            console.log('Time changed to: ' + $scope.postMessage.date);
        };

    }]);
    
});