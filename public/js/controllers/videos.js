define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('VideosController',
    ['$scope', '$location', '$uibModal', 'videosService', 'alertsService', 
    function($scope,  $location, $uibModal, videosService, alertsService) {

        $scope.videos = {
            provider : null,
            providers: ['google', 'dailymotion', 'vimeo', 'soundcloud', 'mixcloud'],
            list : [],
            changeProvider : function() {
                console.log("changeProvider -> ",$scope.videos.provider);
                videosService.getMedia($scope.videos.provider).then(function(media) {
                    $scope.videos.list=media;
                    $scope.displayedCollection = [].concat($scope.videos.list);
                    
                    //stats:
                    var playbackCount=0, downloadCount=0, likes=0, commentsCount=0, repostCount=0;
                    if($scope.videos.provider === 'soundcloud' || $scope.videos.provider === 'mixcloud') {
                        media.forEach(function(datum) {
                            playbackCount+=datum.playbackCount;
                            if(datum.downloadCount)
                                downloadCount+=datum.downloadCount;
                            else if(datum.repostCount)
                                repostCount+=datum.repostCount;
                            likes+=datum.likes;
                            commentsCount+=datum.commentsCount;
                        });
                        $scope.data = [[playbackCount, commentsCount, likes]];
                        $scope.labels = ['lectures', 'commentaires', 'likes'];
                        if($scope.videos.provider === 'soundcloud') {
                            $scope.data[0].push(downloadCount);
                            $scope.labels.push('téléchargements');
                        } else {
                            $scope.data[0].push(repostCount);
                            $scope.labels.push('reposts');
                        }
                        
                    } else {
                        $scope.data = [];
                        $scope.labels = [];
                    }
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
                    case 'mixcloud':
                        return 'https://www.mixcloud.com'+videoId;
                    default:
                        return '#';
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