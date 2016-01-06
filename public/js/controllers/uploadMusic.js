define(['./module', 'moment'], function (appModule, moment) {
    
    'use strict';
    
    appModule.controller('UploadMusicController', 
    ['$scope', '$rootScope', '$window', '$location', '$uibModal', 'FileUploader', 'alertsService', 'eventService', 'messageService',
    function($scope, $rootScope, $window, $location, $uibModal, FileUploader, alertsService, eventService, messageService) {
        uploadMusicController($scope, $rootScope, $window, $location, $uibModal, FileUploader, alertsService, eventService, messageService);
    }]);
    
    appModule.controller('UploadMusicModalController', 
    ['$scope', '$rootScope', '$window', '$location', '$uibModal', '$uibModalInstance', 'FileUploader', 'alertsService', 'eventService', 'messageService','publishFileService', 'file',  'provider',
    function($scope, $rootScope, $window, $location, $uibModal, $uibModalInstance, FileUploader, alertsService, eventService, messageService, publishFileService, file, provider) {

        $scope.modal = {
            title : 'Publier depuis le cloud',
            url : 'views/uploadMusic.html',        
            cancel : function () {
                $uibModalInstance.dismiss('cancel');
            }, 
            ok : function() {
                var formData ={
                    title : $scope.uploadMusicData.title,
                    description : $scope.uploadMusicData.description,
                    providers : $scope.uploadMusicData.selectedProviders,                
                    fileId : file.id,
                    fileName : file.name,
                    //providersOptions : $rootScope.selectedProvidersOptions,
                    cloudProvider : provider
                };
                var tags = $scope.processTags();
                if(tags.length>0)
                    formData.tags=tags;
                console.log("publishFileService.publishFromCloud ");
                publishFileService.publishFromCloud(formData).then(function(result) {  
                    //alertService blabla
                    $uibModalInstance.dismiss('ok');
                });
            }
        };
        console.log("UploadFileModalController file ? ", file);
        uploadMusicController($scope, $rootScope, $window, $location, $uibModal, FileUploader, alertsService, eventService, messageService, file);   
    }]);

    function uploadMusicController($scope, $rootScope, $window, $location, $uibModal, FileUploader, alertsService, eventService, messageService, cloudFile) {
        
        var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
        console.log("uploadMusicController file ? ", cloudFile);
        $scope.uploadMusicData = {
            cloudFile : cloudFile,
            title : "",
            description : "",
            date : new Date(),
            tags : [],
            providers : ['mixcloud', 'soundcloud','facebook'],
            selectedProviders : [],
            isScheduled : false,
            isFile: cloudFile!==undefined           
        };
    
        $scope.uploader = new FileUploader({url : '/uploadMusic/'+localData.user.id});
        $scope.uploader.filters.push({
            name: 'audioFilter',
            fn: function(item) {
                var isFileOk=item.type.indexOf("audio") !== -1;
                if(isFileOk) 
                    $scope.uploadMusicData.isFile=true;                    
                else
                    alertsService.error('only audio files are supported');
                return isFileOk;
            }
        });
        
        var modalInstance;
        function openLoading() {
            modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'modalContent.html',
                controller: 'WaitingModalController',
                size: 'lg',
                resolve: {
                    items: function () {
                        return $scope.items;
                    }
                }
            });
            modalInstance.result.then(function(selectedItem) {
                $scope.selected = selectedItem;
                console.log("Modal executed");
            }, function () {
                console.log('Modal dismissed at: ' + new Date());
            });
        }

        //loading data ?
        var modifyParams = $location.search();
        console.log("url params ?", modifyParams);
        if(modifyParams.eventId) {
            eventService.retrieveOne(modifyParams.eventId).then(function(uploadFileEvent) {
                console.log("event retrieved ", uploadFileEvent);
                $scope.uploadMusicData.date = new Date(uploadFileEvent.dateTime);
                $scope.uploadMusicData.selectedProviders=uploadFileEvent.providers;
                $scope.uploadMusicData.title=uploadFileEvent.eventParams[1];
                $scope.uploadMusicData.description=uploadFileEvent.eventParams[2];
                $scope.uploadMusicData.tags=uploadFileEvent.eventParams[3];
                $scope.uploadMusicData.eventId=uploadFileEvent.eventId;
                $scope.uploadMusicData.isFile=true;
                $scope.uploadMusicData.isScheduled=true;
            });
        } else {
           $scope.uploadMusicData.date = moment(new Date()).add(1, 'hours').minutes(0).seconds(0).format();
        }
        
        $scope.uploader.onProgressItem =function(item, progress) {
            if(progress===100)
                $rootScope.stopProgress("Fichier téléchargé sur le serveur SocialUp, traitement en cours.");
            else
                $rootScope.doProgress(progress);
        };
        
       $scope.uploader.onErrorItem = function(item, response, status, headers) {
           console.log('error: ', response.error);
           modalInstance.close();
           alertsService.error("Erreur dans l'envoi de message. Erreur : "+response.error_description, 5000);
           if(response.error.retry_after)
           alertsService.warn("Réessayez dans  "+response.error.retry_after+" secondes", 10000);
       };

       $scope.uploader.onSuccessItem = function(item, response, status, headers) {
            modalInstance.close();
            $scope.result=response[0];
            console.log("onSuccessItem, result? ", $scope.result);
            alertsService.success('music successfully ' + ($scope.uploadMusicData.isScheduled ? 'scheduled' : 'published') , 5000);
            
        };
        
        $scope.update = function(item) {
            
            if(item!==undefined) {
                console.log("update file");
            } else {
                //eventService.update();
            }
        };
        
        $scope.validateFieldsAndUpload = function(item) {

            if($scope.uploadMusicData.title.length<=3) {
                alertsService.warn("le titre ne peut pas avoir moins de 3 caractères");
                return;
            }
            if($scope.uploadMusicData.selectedProviders.length===0) {
                alertsService.warn("Vous devez choisir au moins un provider");
                return;
            }
            
            item.formData = [
                {'title' : $scope.uploadMusicData.title},
                {'description' : $scope.uploadMusicData.description},
                {'providers' : $scope.uploadMusicData.selectedProviders},
                {'provider' : 'mixcloud'}
            ];
           var tags = processTags();
            if(tags.length>0)
                item.formData.tags = tags;
            if($scope.uploadMusicData.isScheduled) {
                item.formData.push({'scheduledDate' : $scope.uploadMusicData.date});
            }
            //item.formData.push( {'selectedProvidersOptions' : JSON.stringify($rootScope.selectedProvidersOptions)});
            openLoading();
            //console.log("upload with formData ",item.formData);
            if($scope.uploadMusicData.cloudFile) {
                //TODO envoyer publication depuis cloud
            } else
                item.upload();
        };
        
        //date picker
        $scope.format = 'dd MMMM yyyy';
        $scope.status = {
            opened: false
        };
        $scope.clear = function () {
            $scope.uploadMusicData.date = null;
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
            $scope.uploadMusicData.date = new Date(year, month, day);
        };

        //timepicker
        $scope.hstep = 1;         
        $scope.mstep = 5;
        $scope.ismeridian = false;       
        $scope.changed = function () {
            console.log('Time changed to: ' + $scope.uploadMusicData.date);
        };
        
        function processTags() {
            var tags = [];
            for(var i=0; i<$scope.uploadMusicData.tags.length; i++) {
                tags.push($scope.uploadMusicData.tags[i].text);
            }
            return tags;
        }
        $scope.processTags=processTags;
        

    }

});