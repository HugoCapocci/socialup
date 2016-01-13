define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('SearchVideoController',
    ['$scope', '$location', 'videosService', 'alertsService', 
    function($scope,  $location, videosService, alertsService) {
        
        $scope.searchVideoForm =  {
            orders : ["date", "rating"/* best ratio like/dislike on youtube */, "relevance", "title", "viewCount"],
            order : "relevance",        
            playlist : []
        };
        $scope.videos={};
        $scope.itemsByPage = 10;
        
        $scope.providers = ['google', 'dailymotion'];
        $scope.searchVideo = function() {
            if($scope.searchVideoForm.videoName && $scope.searchVideoForm.videoName.length>1)
                // recherches en parallèle
                $scope.providers.forEach(function(provider)  {
                    searchVideo(provider, $scope.searchVideoForm.videoName, $scope.searchVideoForm.order);
                });
            else
                alertsService.warn("Veuillez taper un titre à rechercher ");
        };
         
        $scope.setSelected = function($index) {
            console.log("setSelected $index ",$index);
            $scope.searchVideoForm.selected = $index;
        };
        $scope.addToPlaylist = function(provider, $index) {
             
            var selected = {
                video : $scope.videos[provider][$index],
                provider : provider
            };
            
            if(isAlreadySelected(selected.video.id, provider)) {
                alertsService.warn("Vidéo déjà dans la playlist");
                return;
            }
            $scope.searchVideoForm.playlist.push(selected);
            if($scope.searchVideoForm.selected===undefined)
                $scope.searchVideoForm.selected = $scope.searchVideoForm.playlist.length-1;
            console.log('$scope.searchVideoForm.selected: ',$scope.searchVideoForm.selected);
            console.log("Selected Video: ", $scope.searchVideoForm.playlist[$scope.searchVideoForm.selected].video);
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
            if($scope.searchVideoForm.playlist.length-1 > $scope.searchVideoForm.selected)  {
                console.log("next video");
                $scope.$apply(function () {
                   $scope.searchVideoForm.selected=$scope.searchVideoForm.selected+1;
                });
                
            } else {
                console.log("reset video");
                $scope.$apply(function () {
                    $scope.searchVideoForm.selected=0;
                });
            }
        });
        
        //test listeners
        $scope.$on("fullscreenchange", function(e) {
            console.log("fullscreenchange event! ", e);
        });
        $scope.$on("mozfullscreenchange", function(e) {
            console.log("mozfullscreenchange event! ", e);
        });
        $scope.$on("webkitfullscreenchange", function(e) {
            console.log("webkitfullscreenchange event! ", e);
        });
        $scope.$on("msfullscreenchange", function(e) {
            console.log("msfullscreenchange event! ", e);
        });
        
    }]);    
    
});