define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('VideosController',
    ['$scope', '$location', '$uibModal', 'videosService', 'alertsService', 
    function($scope,  $location, $uibModal, videosService, alertsService) {

        $scope.isLoading = false;
        $scope.media = {
            provider : null,
            providers: ['google', 'dailymotion', 'vimeo', 'soundcloud', 'mixcloud'],
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
                   // var playbackCount=0, downloadCount=0, likes=0, commentsCount=0, repostCount=0;
                   /* if($scope.media.provider === 'soundcloud' || $scope.media.provider === 'mixcloud') {
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
                        if($scope.media.provider === 'soundcloud') {
                            $scope.data[0].push(downloadCount);
                            $scope.labels.push('téléchargements');
                        } else {
                            $scope.data[0].push(repostCount);
                            $scope.labels.push('reposts');
                        }
                        
                    } else {
                        $scope.data = [];
                        $scope.labels = [];
                    }*/
                }, function(err) {
                    $scope.isLoading=false;
                    alertsService.error("Impossible de récupérer les vidéos. Err: "+err);
                });
            },
            getURL : function(mediaId) {
                switch($scope.media.provider) {
                    case 'google':
                        return 'https://www.youtube.com/watch?v='+mediaId;
                    case 'dailymotion':
                        return 'http://www.dailymotion.com/video/'+mediaId;
                    case 'vimeo':
                        return 'https://vimeo.com/'+mediaId;
                    case 'mixcloud':
                        return 'https://www.mixcloud.com'+mediaId;
                    default:
                        return '#';
                }
            }
        };
        $scope.displayedCollection = [].concat($scope.media.list);
        $scope.animationsEnabled = true;
      
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
            
            console.log("modify media id? ", media.id);
        };
        
        $scope.parseDate = function(dateString) {
            var date = new Date(dateString);
            return date.getTime();
        };
        
    }]);
    
});