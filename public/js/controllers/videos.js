define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('VideosController',
    ['$scope', '$location', '$uibModal', 'videosService', 'alertsService', 
    function($scope,  $location, $uibModal, videosService, alertsService) {

        $scope.videos = {
            provider : null,
            providers: ['google', 'dailymotion', 'vimeo'],
            list : [],
            changeProvider : function() {
                console.log("changeProvider -> ",$scope.videos.provider);
                videosService.getVideos($scope.videos.provider).then(function(videos) {
                    $scope.videos.list=videos;
                    $scope.displayedCollection = [].concat($scope.videos.list);
                }, function(err) {
                    alertsService.error("Impossible de récupérer les vidéos. Err: "+err);
                });
            },
            getURL : function(videoId) {
                switch($scope.videos.provider) {
                    case 'google':
                        return 'https://www.youtube.com/watch?v='+videoId;
                    case 'dailymotion':
                        return 'http://www.dailymotion.com/video/'+videoId;
                    case 'vimeo':
                        return 'https://vimeo.com/'+videoId;
                }
            }
        };
        $scope.displayedCollection = [].concat($scope.videos.list);
        $scope.animationsEnabled = true;
      
        function openModal(controller, eventId) {

            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'modalContent.html',
                controller: controller+'ModalController',
                size: 'lg',
                resolve: {
                    eventId : function() {
                        return eventId;
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

        $scope.deleteVideo= function(video) {
            console.log("delete video: ", video.id);
            //TODO open modal window with loading gif, and close it after
            videosService.delete($scope.videos.provider, video.id).then(function() {
                var index = $scope.videos.indexOf(video);
                if (index !== -1) {
                    $scope.videos.splice(index, 1);
                }
            }, function(err) {
                alertsService.error("Impossible d'effacer la video. Erreur : "+err);
            });
        };
        
        $scope.modifyVideo = function(video) {
            
            console.log("modify Video id? ", video.id);
        };
        
        $scope.parseDate = function(dateString) {
            var date = new Date(dateString);
            return date.getTime();
        };
        
    }]);
    
});