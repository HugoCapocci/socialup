define(['./module'], function (appModule) {
    
    'use strict';
    
    appModule.controller('UploadFileController', ['$scope', '$window', 'FileUploader', function($scope, $window, FileUploader) {
        
        var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
    
        $scope.uploadFileData = {
            title : "",
            description : "",
            isCloud : false,
            date : new Date(),
            tags : [],
            providers : ['google', 'dailymotion','facebook'],
            selectedProviders : [],
        };
        $scope.uploader = new FileUploader({url : '/uploadFile/'+localData.user.id});
        $scope.uploader.filters.push({
            name: 'videoFilter',
            fn: function(item) {
                console.log("item filtered: ", item);
                return item.type.indexOf("video") !== -1;
            }
        });

        $scope.uploader.onBeforeUploadItem = function(item) {
            console.log("on before upload");
        };
        
        $scope.uploader.onWhenAddingFileFailed = function(item, filter, options) {
            console.error("add file failed: not a video");
        };
        
        $scope.validateFieldsAndUpload = function(item) {
            
            if($scope.uploadFileData.title.length<=3) {
                console.log("le titre ne peut pas avoir moins de 3 caractères");
                return;
            }
            
            item.formData = [
                {'title' : $scope.uploadFileData.title},
                {'description' : $scope.uploadFileData.description},
                {'providers' : $scope.uploadFileData.selectedProviders},
                {'scheduledDate' : $scope.uploadFileData.date},
                {'tags' : processTags()}
            ];
            if($scope.uploadFileData.isCloud) {
                console.log("add cloud option");
                item.formData.push( {'isCloud' : true} );
            }
            console.log("upload with formData ",item.formData);
            item.upload();
        };
        
        //date picker
        $scope.format = 'dd-MMMM-yyyy';
        $scope.status = {
            opened: false
        };
        $scope.clear = function () {
            $scope.uploadFileData.date = null;
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
            $scope.uploadFileData.date = new Date(year, month, day);
        };
        
        //timepicker
        $scope.hstep = 1;         
        $scope.mstep = 5;
       /* $scope.options = {
            hstep: [1, 2, 3],
            mstep: [1, 5, 10, 15, 25, 30]
        };*/
        $scope.ismeridian = false;
        $scope.uploadFileData.date.setHours(14);
        $scope.uploadFileData.date.setMinutes(0);       
        $scope.changed = function () {
            console.log('Time changed to: ' + $scope.uploadFileData.date);
        };
        
        function processTags() {
            var tags = [];
            for(var i=0; i<$scope.uploadFileData.tags.length; i++) {
                tags.push($scope.uploadFileData.tags[i].text);
            }
            return tags;
        }
        
    }]);

});