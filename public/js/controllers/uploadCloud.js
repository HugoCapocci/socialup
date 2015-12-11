define(['./module'], function(appModule) {
    
    'use strict';
    
    appModule.controller('UploadCloudModalController', 
    ['$scope', '$rootScope', '$location', '$uibModalInstance', 'cloudService', 'alertsService', 'eventId', 
    function($scope, $rootScope, $location, $uibModalInstance, cloudService, alertsService, eventId) {
       
        $scope.modal = {
            title : 'ChainedEvents',
            url : 'views/uploadCloud.html', 
            ok : function() {
                //create event
                cloudService.uploadChained($scope.uploadCloud.provider, eventId, $scope.uploadCloud.folderSelected).then(function() {
                    alertsService.success("Evènement chainé créé");
                    $uibModalInstance.close();
                }, function(err) {
                    alertsService.error("Impossible de créer l'évènement chainé. Erreur : "+err);
                });           
            },
            cancel : function () {
                $uibModalInstance.dismiss('cancel');
            }
        };
        
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
        $scope.uploadCloud = {
            providers : ['google', 'dropbox'],
            provider : 'choisissez'
        };

        function loadProviderRootData() {
            cloudService.getFolders($scope.uploadCloud.provider, undefined).then(function(files) {
                $scope.dataForTheTree = files;
                //console.log("cloud service OK");
            }, function(err) {
                alertsService.error("Impossible de charger les fichiers du cloud. Erreur : "+err);
            });
        }
        $scope.uploadCloud.changeProvider=loadProviderRootData;

        $scope.showToggle = function(node, expanded/*, $parentNode, $index, $first, $middle, $last, $odd, $even*/) {
            if(expanded) {            
                cloudService.getFolders($scope.uploadCloud.provider, node.id).then(function(files) {
                    node.children = files;
                    //console.log("cloud service OK");
                }, function(err) {
                    alertsService.error("Impossible de charger les fichiers du cloud. Erreur : "+err);
                });
            }
        };
        
        $scope.showSelected = function(node/*, selected, $parentNode, $index, $first, $middle, $last, $odd, $even*/) {
            console.log('selected: '+node.name+', type: '+node.mimeType+', id: '+node.id);
            $scope.uploadCloud.folderSelected= node.id;
        };
    }]);
    
});