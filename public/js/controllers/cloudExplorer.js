define(['./module'], function (appModule) {
    
    'use strict';
    
    var FOLDER_TYPE_MIME = 'application/vnd.google-apps.folder';
    
    appModule.controller('CloudExplorerController', ['$scope', 'cloudService', function($scope, cloudService) {
            
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
            provider : 'choisissez'
        };
        
        function loadProviderRootData() {
            cloudService.getFolders($scope.cloudExplorer.provider).then(function(files) {
                $scope.dataForTheTree = files;
                console.log("cloud service OK");
            }, function(err) {
                console.log("error in cloud service: ", err);
            });
        }
        $scope.cloudExplorer.changeProvider=loadProviderRootData;
        //init
        //loadProviderRootData();

        $scope.showToggle = function(node, expanded/*, $parentNode, $index, $first, $middle, $last, $odd, $even*/) {

            if(expanded) {            
                cloudService.getFolders($scope.cloudExplorer.provider, node.id).then(function(files) {
                    node.children = files;
                    console.log("cloud service OK");
                }, function(err) {
                    console.log("error in cloud service: ", err);
                });
            }
        };
        
        $scope.showSelected = function(node, selected/*, $parentNode, $index, $first, $middle, $last, $odd, $even*/) {
            console.log('selected: '+node.name+', type: '+node.mimeType+', id: '+node.id);
        };
        
    }]);

});