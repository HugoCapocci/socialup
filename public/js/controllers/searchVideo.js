define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('SearchVideoController',
    ['$scope', '$location', 'videosService', 'alertsService', 
    function($scope,  $location, videosService, alertsService) {
        
        $scope.searchVideoForm =  {
            orders : ["date", "rating"/* best ratio like/dislike on youtube */, "relevance", "viewCount"],
            order : "relevance",        
            playlist : []
        };
        $scope.videos={};
        $scope.itemsByPage = 10;
        
        $scope.providers = ['google', 'dailymotion'];
        $scope.searchVideo = function() {
            if($scope.searchVideoForm.videoName && $scope.searchVideoForm.videoName.length>1)
                //search for all video providers at the same time
                $scope.providers.forEach(function(provider)  {
                    searchVideo(provider, $scope.searchVideoForm.videoName, $scope.searchVideoForm.order);
                });
            else
                alertsService.warn("Veuillez taper un titre à rechercher ");
        };
         
        $scope.setSelected = function(element) {
            console.log("setSelected element ",element);
            $scope.searchVideoForm.selected = element;
        };
        $scope.addToPlaylist = function(provider, $index) {
             
            var selected = {
                video : $scope.videos[provider][$index],
                provider : provider
            };
            
            if(isAlreadySelected(selected.video.id, provider)) {
                alertsService.warn("La vidéo sélectionnée est déjà dans la playlist");
                return;
            }
            $scope.searchVideoForm.playlist.push(selected);
            if($scope.searchVideoForm.selected===undefined)
                $scope.searchVideoForm.selected = $scope.searchVideoForm.playlist[$scope.searchVideoForm.playlist.length-1];
            console.log('$scope.searchVideoForm.selected: ',$scope.searchVideoForm.selected);
            console.log("Selected Video: ", $scope.searchVideoForm.selected.video);
        };
        
        function isAlreadySelected(videoId, provider) {
            var isSelected=false;
            $scope.searchVideoForm.playlist.forEach(function(element) {
                if(element.provider===provider && element.video.id===videoId) {
                    isSelected=true;
                    return;
                }
            });
            return isSelected;
        }
        
        function getPlaylistIndex(element) {
            
            for(var i=0; i<$scope.searchVideoForm.playlist.length;i++) {
                var row = $scope.searchVideoForm.playlist[i];
                if(element.provider===row.provider && element.video.id===row.video.id) {
                    return i;
                }
            }
            return -1;
        }
        $scope.getPlaylistIndex=getPlaylistIndex;
    
        function searchVideo(provider, videoName, order) {
            videosService.searchVideo(provider, videoName, order).then(function(data) {
                $scope.videos[provider]=data.videos;
                alertsService.success(data.totalResults+ " vidéos trouvées pour le fournisseur "+provider);     
            }, function(err) {
                alertsService.error("Impossile de récupérer des vidéo pour le fournisseur "+provider+". "+err);    
            });
        }
        
        //videoStarted
        $scope.$on('videoStarted', function(/*args*/) {
            //alert('bye bye');
            console.log('videoStarted');
        });
        //videoFinished
        $scope.$on('videoFinished', function(/*args*/) {
           //lit la video suivante !
            var selectedIndex = getPlaylistIndex($scope.searchVideoForm.selected);
            if($scope.searchVideoForm.playlist.length-1 > selectedIndex)  {
                console.log("next video");
                $scope.$apply(function () {
                   $scope.searchVideoForm.selected=$scope.searchVideoForm.playlist[selectedIndex+1];
                });
                
            } else {
                console.log("reset video");
                $scope.$apply(function () {
                    $scope.searchVideoForm.selected=$scope.searchVideoForm.playlist[0];
                });
            }
        });
    
    }]);    
    
});