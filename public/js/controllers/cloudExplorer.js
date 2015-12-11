define(['./module'], function (appModule) {
    
    'use strict';
    
    var FOLDER_TYPE_MIME = 'application/vnd.google-apps.folder';
    
    appModule.controller('CloudExplorerController', ['$scope', '$uibModal', 'cloudService', function($scope, $uibModal, cloudService) {
            
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
        
        function loadProviderRootData() {
            cloudService.getFiles($scope.cloudExplorer.provider).then(function(files) {
                $scope.dataForTheTree = files;
                console.log("cloud service OK files: ", files);
            }, function(err) {
                console.log("error in cloud service: ", err);
            });
        }
        $scope.cloudExplorer.changeProvider=loadProviderRootData;
        //init
        //loadProviderRootData();

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
            if(selected && !node.isFolder)
                $scope.cloudExplorer.selectedFile=node;
            else
                $scope.cloudExplorer.selectedFile=undefined;
            console.log('selectedFile: '+node.name+', type: '+node.mimeType+', id: '+node.id);
        };
                
        // iFrame url for google doc preview 'https://drive.google.com/file/d/'+file.id+'/view'
        
        // dropbox 'https://www.dropbox.com/home/'+path+'?preview='+file.name
    }]);

});