define(['./module', 'moment'], function (appModule, moment) {
    
    'use strict';
    
    appModule.controller('UploadFileController', 
    ['$scope', '$window', '$location', 'FileUploader', 'alertsService', 'eventService', 'messageService',
    function($scope, $window, $location, FileUploader, alertsService, eventService, messageService) {
        
        var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
    
        $scope.uploadFileData = {
            title : "",
            description : "",
            isCloud : false,
            date : new Date(),
            tags : [],
            providers : ['google', 'dailymotion','facebook'],
            selectedProviders : [],
            isFile:false,
            isMessageAfter : false,
            messageProviders : ['twitter', 'facebook', 'linkedin'],
            selectedMessageproviders : []
        };
        $scope.uploader = new FileUploader({url : '/uploadFile/'+localData.user.id});
        $scope.uploader.filters.push({
            name: 'videoFilter',
            fn: function(item) {
                var isFileOk=item.type.indexOf("video") !== -1;
                if(isFileOk) 
                    $scope.uploadFileData.isFile=true;                    
                else
                    alertsService.error('only video files are supported');
                return isFileOk;
            }
        });

         //loading data ?
        var modifyParams = $location.search();
        console.log("url params ?", modifyParams);
        if(modifyParams.eventId) {

            eventService.retrieveOne(modifyParams.eventId).then(function(uploadFileEvent) {
                console.log("event retrieved ", uploadFileEvent);  
                $scope.uploadFileData.date = new Date(uploadFileEvent.dateTime);
                $scope.uploadFileData.selectedProviders=uploadFileEvent.eventParams[0];
                $scope.uploadFileData.title=uploadFileEvent.eventParams[2];
                $scope.uploadFileData.description=uploadFileEvent.eventParams[3];
                $scope.uploadFileData.tags=uploadFileEvent.eventParams[4];
                $scope.uploadFileData.eventId=uploadFileEvent.eventId;
                $scope.uploadFileData.isFile=true;
            });
        } else {
           $scope.uploadFileData.date = moment(new Date()).add(1, 'hours').minutes(0).seconds(0).format();
        }

        $scope.uploader.onSuccessItem = function(item, response, status, headers) {
            alertsService.success('video successfully uploaded', 5000);
            console.log("reponse", response);
            console.log("item", item);
            if($scope.uploadFileData.isMessageAfter && $scope.uploadFileData.selectedMessageProviders.length>0) {
                messageService.postMessage($scope.uploadFileData.selectedMessageProviders, response[0].url).then(function(results) {
                    console.log("results: ",results);
                    alertsService.success("Message publié avec succès");
                }, function(err) {
                    alertsService.error("Erreur dans l'envoit de message. Err: "+err);
                });
            }
         };
        
        $scope.validateFieldsAndUpload = function(item) {
            
            if($scope.uploadFileData.title.length<=3) {
                alertsService.warn("le titre ne peut pas avoir moins de 3 caractères");
                return;
            }
            if($scope.uploadFileData.selectedProviders.length===0) {
                alertsService.warn("Vous devez choisir au moins un provider");
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
                //console.log("add cloud option");
                item.formData.push( {'isCloud' : true} );
            }
            //console.log("upload with formData ",item.formData);
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
 
        //disable past dates
        $scope.disabled = function(date) {
            return date.getTime() < Date.now();
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
        $scope.ismeridian = false;       
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