define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('SearchVideoController',
    ['$scope', '$window', '$location', '$sce', 'videosService', 'alertsService', 
    function($scope, $window, $location, $sce, videosService, alertsService) {
        
        $scope.searchVideoForm =  {
            orders : [
                {value: "relevance", label:"Pertinence"},
                {value: "date", label:"Plus récent"},
                {value: "rating", label:"Meilleur ratio"},
                {value: "viewCount", label:"Plus de vues"}
            ],                   
            playlist : [],
            results : {},
            limit : 10,
            autoplay : true,
            loop : true,
            isReading : false,
            isPaused : false,
            provider : {},
            changePage : function(provider) {
                console.log("change page to ", $scope.searchVideoForm.provider[provider].currentPage);                
                searchVideo(provider, $scope.searchVideoForm.provider[provider].currentPage);         
            },
            changeStep : function(provider, step) {
                
                console.log("changeStep: ", step);
                var pageToken;
                if(step==='forward')
                    pageToken = $scope.searchVideoForm.results[provider].nextPageToken;
                else
                    pageToken = $scope.searchVideoForm.results[provider].prevPageToken;
                searchVideo(provider, pageToken);
            }
        };
        $scope.providers = ['google', 'dailymotion', 'vimeo'];
        $scope.providers.forEach(function(provider) {
            $scope.searchVideoForm.provider[provider] = {
                 currentPage : 1,
                 isLoading : false
            };
        });
                
        function searchVideo(provider, next) {
            
            $scope.searchVideoForm.provider[provider].isLoading=true;
            
            videosService.searchVideo(
                provider, 
                $scope.searchVideoForm.videoName, 
                $scope.searchVideoForm.limit,
                $scope.searchVideoForm.order.value, 
                next
            ).then(function(data) {
                $scope.searchVideoForm.provider[provider].isLoading=false;
                $scope.searchVideoForm.results[provider]=data;
                if(provider !== 'google') {
                    if($scope.searchVideoForm.results[provider].totalResults /$scope.searchVideoForm.limit > 100)
                        $scope.searchVideoForm.results[provider].totalPages = 100 * $scope.searchVideoForm.limit;
                    else
                        $scope.searchVideoForm.results[provider].totalPages = $scope.searchVideoForm.results[provider].totalResults;
                }
                alertsService.success(data.totalResults + " vidéos trouvées pour le fournisseur "+provider);
            
            }, function(err) {
                $scope.searchVideoForm.provider[provider].isLoading=false;
                alertsService.error("Impossible de récupérer des vidéo pour le fournisseur "+provider+". "+err);    
            });
        }
        //deault order
        $scope.searchVideoForm.order = $scope.searchVideoForm.orders[0];
        //$scope.itemsByPage = 5;
                
        $scope.searchVideo = function() {
            if($scope.searchVideoForm.videoName && $scope.searchVideoForm.videoName.length>1)
                //search for all video providers at the same time
                $scope.providers.forEach(function(provider)  {
                     searchVideo(provider);
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
                video : $scope.searchVideoForm.results[provider].videos[$index],
                provider : provider
            };
            
            if(isAlreadySelected(selected.video.id, provider)) {
                alertsService.warn("La vidéo sélectionnée est déjà dans la playlist");
                return;
            }
            $scope.searchVideoForm.playlist.push(selected);
            if($scope.searchVideoForm.selected===undefined) {
                $scope.searchVideoForm.selected = $scope.searchVideoForm.playlist[$scope.searchVideoForm.playlist.length-1];
            }
            console.log('$scope.searchVideoForm.selected: ',$scope.searchVideoForm.selected);
            console.log("Selected Video: ", $scope.searchVideoForm.selected.video);
            //playlist lengthInSeconds ?
        };
        
        $scope.removeFromPlaylist = function(element) {
    
            var index = getPlaylistIndex(element);
            console.log("removeFromPlaylist: ", element);
            $scope.searchVideoForm.playlist.splice(index, 1);
            
            if(element.provider===$scope.searchVideoForm.selected.provider && element.video.id===$scope.searchVideoForm.selected.video.id) {
                console.log("removing current played element ");
                //TODO stop properly the video ?
                delete $scope.searchVideoForm.selected;
            }
        };

        $scope.sanitize = function(varWithHtml) {
            return $sce.trustAsHtml("<h5>"+varWithHtml+"</h5>");
        };
    
        $scope.openChannel = function(channelURL) {
            if(!channelURL || channelURL.length === 0)
                return;
            console.log("open Channel URL");
            $window.open(channelURL, '_blank');
        };

        function isAlreadySelected(videoId, provider) {
            var isSelected=false;
            $scope.searchVideoForm.playlist.forEach(function(element) {
                console.log("element: ",element);
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

        $scope.isEmpty = function(object) {
            return Object.keys(object).length===0;
        };
        
        //videoStarted
        $scope.$on('videoStarted', function(/*args*/) {
            $scope.$apply(function () {
                $scope.searchVideoForm.isReading=true;
                $scope.searchVideoForm.isPaused=false;
            });
            console.log('videoStarted');
        });
        //TODO videoOnPause
         $scope.$on('videoPaused', function(/*args*/) {
            $scope.$apply(function () {
                $scope.searchVideoForm.isReading=false;
                $scope.searchVideoForm.isPaused=true;
            });
            console.log('videoPaused');
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

            } else if($scope.searchVideoForm.loop) {
                console.log("reset video");
                $scope.$apply(function () {
                    $scope.searchVideoForm.selected=$scope.searchVideoForm.playlist[0];
                });
            } else
                $scope.searchVideoForm.isReading=false;
            //otherwise stop
        });

        $scope.changeCurrentPlaying = function(order) {
            var selectedIndex = getPlaylistIndex($scope.searchVideoForm.selected);            
            if(order==='backward') {
                if(selectedIndex!==0) {
                   $scope.searchVideoForm.selected=$scope.searchVideoForm.playlist[selectedIndex-1];
                }
            } else {
                if($scope.searchVideoForm.playlist.length-1 > selectedIndex)  {
                   $scope.searchVideoForm.selected=$scope.searchVideoForm.playlist[selectedIndex+1];
                }
            }
        };
        
        $scope.changePlayingState = function() {
            //console.log("changePlayingState to ",!$scope.searchVideoForm.isPaused);
            $scope.searchVideoForm.isPaused = !$scope.searchVideoForm.isPaused;
            $scope.searchVideoForm.isReading = !$scope.searchVideoForm.isReading;
        };

    }]);

});