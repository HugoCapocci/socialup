define(['./module'], function (appModule) {
    
    'use strict';
    
    appModule.controller('CloudExplorerController', ['$scope', '$window', '$timeout', '$uibModal', 'cloudService', 'alertsService', 'FileUploader', 
        function($scope, $window, $timeout, $uibModal, cloudService, alertsService, FileUploader) {
        
        var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
            
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
            providers : ['google', 'dropbox'],
            provider : null,
            selectedFile :null
        };
        
        $scope.publishFile = function() {
          
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'modalContent.html',
                controller: 'UploadFileModalController',
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
            
            //adapt pie chart data to selected provider
            $scope.labels=["Espace utilisé", "Espace disponible"];
            $scope.data = [spaceUsage[$scope.cloudExplorer.provider].used, spaceUsage[$scope.cloudExplorer.provider].total-spaceUsage[$scope.cloudExplorer.provider].used];
            cloudService.getFiles($scope.cloudExplorer.provider).then(function(files) {
                $scope.dataForTheTree = files;
                console.log("cloud service OK files: ", files);
            }, function(err) {
                console.log("error in cloud service: ", err);
            });
        }
        $scope.cloudExplorer.changeProvider=loadProviderRootData;
       
        $scope.showToggle = function(node, expanded/*, $parentNode, $index, $first, $middle, $last, $odd, $even*/) {

            if(expanded) {            
                cloudService.getFiles($scope.cloudExplorer.provider, node.id).then(function(files) {
                    node.children = files;
                    console.log("cloud service OK");
                }, function(err) {
                    console.log("error in cloud service: ", err);
                });
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
        
        var total, dropboxUsed, gDriveUsed;
        var spaceUsage = {};
        
        cloudService.getSpaceUsage('dropbox').then(function(response) {
            $scope.labels=["Espace utilisé sur dropbox", "Espace utilisé sur google", "Espace total disponible"];
            spaceUsage.dropbox=response.data;
            dropboxUsed=response.data.used;
            total = response.data.total;
            $scope.data=[dropboxUsed];
            console.log("dropbox space usage ", response.data);
            
            return cloudService.getSpaceUsage('google');
        }).then(function(gooleDriveUsage) {
            spaceUsage.google=gooleDriveUsage.data;
            gDriveUsed=gooleDriveUsage.data.used;
            $scope.data.push(gDriveUsed);
            total+=gooleDriveUsage.data.total;
            $scope.data.push( total-(dropboxUsed+gDriveUsed) );
            console.log("gooleDriveUsage: ",gooleDriveUsage.data);            
            console.log("$scope.data? ",$scope.data);
        });
        
        $scope.cloudUploader = new FileUploader({url : '/uploadFileToCloud/'+localData.user.id});

            
        $scope.cloudUploader.onAfterAddingFile = function(fileItem) {
            console.info('onAfterAddingFile', fileItem);
            //upload!
            fileItem.formData = [
                {'provider' : $scope.cloudExplorer.provider},
                {'target' : $scope.cloudExplorer.selectedFile.id}
            ];
            
            fileItem.upload();
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