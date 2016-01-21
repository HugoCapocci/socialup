define(['./module'], function(appModule) {
    
    'use strict';
    
    appModule.controller('VideosController',
    ['$scope', '$location', '$uibModal', 'videosService', 'alertsService', 'userService', 
    function($scope,  $location, $uibModal, videosService, alertsService, userService) {

        var providersAvailable = ['google', 'dailymotion', 'vimeo', 'soundcloud', 'mixcloud'];
        $scope.isLoading = false;
        $scope.media = {
            provider : null,
            providers: [],
            list : [],
            changeProvider : function() {
                console.log("changeProvider -> ",$scope.media.provider);
                $scope.isLoading = true;
                $scope.displayedCollection= [];
                $scope.data=[];
                videosService.getMedia($scope.media.provider).then(function(media) {
                    $scope.isLoading=false;
                    $scope.media.list=media.list;
                    $scope.displayedCollection = [].concat($scope.media.list);
  
                    //stats:
                    $scope.stats = media.stats;
                    console.log("stats: ", $scope.stats);
                  
                }, function(err) {
                    $scope.isLoading=false;
                    alertsService.error("Impossible de récupérer les vidéos. Err: "+err);
                });
            },
            getURL : function(mediaId, $index) {
                switch($scope.media.provider) {
                    case 'google':
                        return 'https://www.youtube.com/watch?v='+mediaId;
                    case 'dailymotion':
                        return 'http://www.dailymotion.com/video/'+mediaId;
                    case 'vimeo':
                        return 'https://vimeo.com/'+mediaId;
                    case 'mixcloud':
                        return 'https://www.mixcloud.com'+mediaId;
                    case 'soundcloud':
                        return $scope.displayedCollection[$index].permalinkURL;
                    default:
                        return '#';
                }
            }
        };
        $scope.displayedCollection = [].concat($scope.media.list);
        $scope.animationsEnabled = true;
      
        var activeProviders = Object.keys( userService.getActiveProviders() );
        console.log("activeProviders: ",activeProviders);
        providersAvailable.forEach(function(provider) {
            if(activeProviders.indexOf(provider)!==-1)
            $scope.media.providers.push(provider);
        });
        
        function openModal(controller, eventId) {

            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'modalContent.html',
                controller: controller+'ModalController',
                size: 'lg'
            });
                       
            modalInstance.result.then(function(selectedItem) {
                $scope.selected = selectedItem;
                console.log("Modal executed");
            }, function () {
                console.log('Modal dismissed at: ' + new Date());
            });
        }

        $scope.deleteVideo= function(media) {
            console.log("delete video: ", media.id);
            //TODO open modal window with loading gif, and close it after
            videosService.delete($scope.media.provider, media.id).then(function() {
                var index = $scope.media.indexOf(media);
                if (index !== -1) {
                    $scope.media.splice(index, 1);
                }
            }, function(err) {
                alertsService.error("Impossible d'effacer le media. Erreur : "+err);
            });
        };
        
        $scope.modifyVideo = function(media) {
            //TODO
            console.log("modify media id? ", media.id);
        };
        
        $scope.parseDate = function(dateString) {
            var date = new Date(dateString);
            return date.getTime();
        };
        
    }]);
    
});