define(['./module'], function (appModule) {
    
    'use strict';
    
    appModule.controller('CloudExplorerController', ['$scope', '$window', '$timeout', '$uibModal', '$q', 'cloudService', 'alertsService', 'userService', 'FileUploader', 
        function($scope, $window, $timeout, $uibModal, $q, cloudService, alertsService, userService, FileUploader) {
    
        $scope.isLoading=false;
        $scope.treeOptions = {
            nodeChildren: "children",
            dirSelectable: true,
            isLeaf : function(node) {
                 return !node.isFolder;
            },
            injectClasses: {
                ul: "a1",
                li: "a2",
                liSelected: "a7",
                iExpanded: "a3",
                iCollapsed: "a4",
                iLeaf: "a5",
                label: "a6",
                labelSelected: "a8"
            }
        };
        $scope.dataForTheTree = [];
        $scope.cloudExplorer = {
            providers : [],
            provider : null,
            selectedFile :null
        };
        
        //user providers: 
        var activeProviders = Object.keys( userService.getActiveProviders() );
        console.log("activeProviders: ",activeProviders);
        if(activeProviders.indexOf('google')!==-1)
            $scope.cloudExplorer.providers.push('google');
        if(activeProviders.indexOf('dropbox')!==-1)
            $scope.cloudExplorer.providers.push('dropbox');
            
        $scope.publishFile = function() {
            
            //selon le type de fichier
            console.log("publishFile: ",$scope.cloudExplorer.selectedFile);
            var name = $scope.cloudExplorer.selectedFile.name;
            var ext = name.substr(name.lastIndexOf('.')+1);
            var audioExts = ['mp3', 'wav', 'aif'];
            console.log("file ext: ", ext);
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'modalContent.html',
                controller: (audioExts.indexOf(ext)!== -1 ? 'UploadMusicModalController' :'UploadFileModalController'),
                size: 'lg',
                resolve: {
                    file : function() {
                        return $scope.cloudExplorer.selectedFile;
                    },
                    provider : function() {
                        return $scope.cloudExplorer.provider;
                    }
                }
            });

            modalInstance.result.then(function() {
                console.log("Modal executed");
            }, function () {
                console.log('Modal dismissed at: ' + new Date());
            });
        };
        
        $scope.getDownloadFileURL = function() {
            
            if($scope.cloudExplorer.selectedFile.downloadUrl)
                return $scope.cloudExplorer.selectedFile.downloadUrl;
            else
                return cloudService.getDownloadFileURL($scope.cloudExplorer.provider,encodeURIComponent($scope.cloudExplorer.selectedFile.id.substring(1)));
        };
        
        //FIXME iFrame workaround not stable
        $scope.downloadFile = function() {
            var iframe = document.createElement('iframe');
            if($scope.cloudExplorer.selectedFile.downloadUrl)
                iframe.src =  $scope.cloudExplorer.selectedFile.downloadUrl;
            else
                iframe.src =  cloudService.getDownloadFileURL($scope.cloudExplorer.provider,encodeURIComponent($scope.cloudExplorer.selectedFile.id.substring(1)));
            iframe.style.display = "none";
            document.body.appendChild(iframe);  
        };
            
        $scope.deleteFile = function() {
            console.log("delete file");
            var fileId = $scope.cloudExplorer.selectedFile.id;
            if($scope.cloudExplorer.provider === 'dropbox')
                fileId=fileId.substring(1);
            cloudService.deleteFile($scope.cloudExplorer.provider, fileId).then(function() {
                console.log("file deleted");
            }, function(err) {
                console.log("err: ", err);
            });
        };

        function loadProviderRootData() {
            
            //load
            $scope.dataForTheTree = undefined;
            $scope.cloudExplorer.selectedFile = undefined;
            $scope.isLoading=true;
            
            //adapt pie chart data to selected provider
            $scope.labels=["Espace utilisé", "Espace disponible"];
            $scope.data = [spaceUsage[$scope.cloudExplorer.provider].used, spaceUsage[$scope.cloudExplorer.provider].total-spaceUsage[$scope.cloudExplorer.provider].used];
            cloudService.getFiles($scope.cloudExplorer.provider).then(function(files) {
                $scope.dataForTheTree = files;
                $scope.isLoading=false;
                console.log("cloud service OK files: ", files);
            }, function(err) {
                $scope.isLoading=false;
                console.log("error in cloud service: ", err);
            });
        }
        $scope.cloudExplorer.changeProvider=loadProviderRootData;
       
        $scope.showToggle = function(node, expanded/*, $parentNode, $index, $first, $middle, $last, $odd, $even*/) {

            if(expanded) {
                $scope.isLoading=true;
                cloudService.getFiles($scope.cloudExplorer.provider, node.id).then(function(files) {
                    $scope.isLoading=false;
                    node.children = files;
                    console.log("cloud service OK");
                }, function(err) {
                    $scope.isLoading=false;
                    console.log("error in cloud service: ", err);
                });
            } else {
                node.children = [];
            }
        };
        
        $scope.showSelected = function(node, selected) {
            console.log("node: ",node);
            if(selected)
                $scope.cloudExplorer.selectedFile=node;
            else
                $scope.cloudExplorer.selectedFile=undefined;
            console.log('selectedFile: '+node.name+', type: '+node.mimeType+', id: '+node.id);
        };
        
        //pie chart
        $scope.chartOptions = {
            //Boolean - Whether we should show a stroke on each segment
            segmentShowStroke : true,
            //String - The colour of each segment stroke
            segmentStrokeColor : "#fff",
            //Number - The width of each segment stroke
            segmentStrokeWidth : 2,
            //Number - The percentage of the chart that we cut out of the middle
            percentageInnerCutout : 0, // This is 0 for Pie charts
            //Number - Amount of animation steps
            animationSteps : 100,
            //String - Animation easing effect
            animationEasing : "easeOutBounce",
            //Boolean - Whether we animate the rotation of the Doughnut
            animateRotate : true,
            //Boolean - Whether we animate scaling the Doughnut from the centre
            animateScale : true,
            tooltipTemplate: "<%if (label){%><%=label%>: <%}%><%var units=['o', 'Ko', 'Mo', 'Go', 'To']; var unitIndex=0; var reducedValue=value; while((reducedValue/1024)>1) {reducedValue=reducedValue/1024;unitIndex++;} %><%=reducedValue.toFixed(2)%> <%=units[unitIndex]%>"
        };
        
        var total=0;
        var spaceUsage = {};
        $scope.data=[];
        $scope.labels=[];
        getGlobalSpaceUsage($scope.cloudExplorer.providers).then(function() {
            Object.keys(spaceUsage).forEach(function(provider) {
                total = total - spaceUsage[provider].used;
            });
            $scope.data.push(total);
            $scope.labels.push("Espace total disponible");
        });
            
        function getGlobalSpaceUsage(providers) {
            var results = [];
            providers.forEach(function(provider) {
                results.push(getSpaceUsage(provider));
            });
            return $q.all(results);            
        }
        function getSpaceUsage(provider) {
            
            var deferred = $q.defer();
            cloudService.getSpaceUsage(provider).then(function(response) {           
                spaceUsage[provider]=response.data;
                total += response.data.total;
                $scope.data.push(response.data.used);
                $scope.labels.push("Espace utilisé sur "+provider);
                deferred.resolve();
            }, function(err){
               deferred.reject(err); 
            });
            return deferred.promise;
        }
        
        $scope.cloudUploader = new FileUploader({url : '/uploadFileToCloud/'+userService.getUserData().id});
            
        $scope.cloudUploader.onAfterAddingFile = function(fileItem) {
            console.info('onAfterAddingFile', fileItem);
            //upload!
            fileItem.formData = [
                {'provider' : $scope.cloudExplorer.provider},
                {'target' : $scope.cloudExplorer.selectedFile.id}
            ];
            $scope.isLoading=true;
            fileItem.upload();
        };
            
        $scope.cloudUploader.onSuccessItem = function(item, response, status, headers) {
            $scope.isLoading=false;
            console.log("TODO: refresh folder");
        };
        
        //Workaround
        $scope.uploadFile = function() {
            console.log("trigger click");
            $timeout(function() {
                var element = angular.element(document.querySelector('#fileDialog'));
                console.log("dom element: ", element);
                element.triggerHandler('click');
            }, 0);
        };

    }]);

});