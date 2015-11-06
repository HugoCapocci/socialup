define(['./module'], function (appModule) {
    
    'use strict';
    
    var FOLDER_TYPE_MIME = 'application/vnd.google-apps.folder';
    
    appModule.controller('CloudExplorerController', ['$scope', 'cloudService', function($scope, cloudService) {
    
         $scope.treeOptions = {
            nodeChildren: "children",
            dirSelectable: true,
            isLeaf : function(node) {
                 return node.mimeType !== FOLDER_TYPE_MIME;
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
        cloudService.getFolders().then(function(files) {
            $scope.dataForTheTree = files;
            console.log("cloud service OK");
        }, function(err) {
            console.log("error in cloud service: ", err);
        });

        $scope.showToggle = function(node, expanded, $parentNode, $index, $first, $middle, $last, $odd, $even) {
            var parent = $parentNode?("child of: " + $parentNode.label):"root node";
            var location = $first?"first":($last?"last":("middle node at index " + $index));
            var oddEven = $odd?"odd":"even";
            
            console.log("toggle, expanded= ",expanded);
            if(expanded) {            
                console.log('open folderId: ', node.id);
                cloudService.getFolders(node.id).then(function(files) {
                    node.children = files;
                    console.log("cloud service OK");
                }, function(err) {
                    console.log("error in cloud service: ", err);
                 });
            }
            // $("#events-listing").append(node.label+ (expanded?" expanded":" collapsed") +" (" + parent + ", " + location +", " + oddEven + ") ");
        };
        $scope.showSelected = function(node, selected, $parentNode, $index, $first, $middle, $last, $odd, $even) {
           /*  var parent = $parentNode?("child of: " + $parentNode.label):"root node";
             var location = $first?"first":($last?"last":("middle node at index " + $index));
             var oddEven = $odd?"odd":"even";*/
            // $("#events-listing").append(node.label+ (selected?" selected":" deselected") +" (" + parent + ", " + location +", " + oddEven + ") ");
            console.log('selected: '+node.name+', type:'+node.mimeType);
        };
    }]);
    
});