define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('SearchVideoController',
    ['$scope', '$location', 'videosService', 'alertsService', 
    function($scope,  $location, videosService, alertsService) {
        
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
            currentPage : 1,
            changePage : function(provider) {
                console.log("change page to ", $scope.searchVideoForm.currentPage);                
                videosService.searchVideo(
                    provider, 
                    $scope.searchVideoForm.videoName, 
                    $scope.searchVideoForm.limit,
                    $scope.searchVideoForm.order.value, 
                    $scope.searchVideoForm.currentPage
                ).then(function(data) {
                
                    $scope.searchVideoForm.results[provider]=data;
                    if(provider === 'dailymotion') {
                        if($scope.searchVideoForm.results[provider].totalResults /10 > 100)
                            $scope.searchVideoForm.results[provider].totalPages = 100 * 10;
                        else
                            $scope.searchVideoForm.results[provider].totalPages = $scope.searchVideoForm.results[provider].totalResults;
                    }

                    alertsService.success(data.totalResults + " vidéos trouvées pour le fournisseur "+provider);     
                }, function(err) {
                    alertsService.error("Impossible de récupérer des vidéo pour le fournisseur "+provider+". "+err);    
                });
                
            },
            changeStep : function(provider, step) {
                
                console.log("changeStep: ", step);
                var pageToken;
                if(step==='forward')
                    pageToken = $scope.searchVideoForm.results[provider].nextPageToken;
                else
                    pageToken = $scope.searchVideoForm.results[provider].prevPageToken;
                
                videosService.searchVideo(
                    provider,
                    $scope.searchVideoForm.videoName,
                    $scope.searchVideoForm.limit,
                    $scope.searchVideoForm.order.value,
                    pageToken
                ).then(function(data) {
    
                    console.log("changeStep data: ", data);
                    $scope.searchVideoForm.results[provider]=data;                
                    if(provider === 'dailymotion') {
                        if($scope.searchVideoForm.results[provider].totalResults /10 > 100)
                            $scope.searchVideoForm.results[provider].totalPages = 100 * 10;
                        else
                            $scope.searchVideoForm.results[provider].totalPages = $scope.searchVideoForm.results[provider].totalResults;
                    }

                    alertsService.success(data.totalResults + " vidéos trouvées pour le fournisseur "+provider);     
                }, function(err) {
                    alertsService.error("Impossible de récupérer des vidéo pour le fournisseur "+provider+". "+err);    
                });
                
            }
        };
        $scope.searchVideoForm.order = $scope.searchVideoForm.orders[0];
        $scope.itemsByPage = 5;
        
        $scope.providers = ['google', 'dailymotion'];
        $scope.searchVideo = function() {
            $scope.searchVideoForm.currentPage =1;
            if($scope.searchVideoForm.videoName && $scope.searchVideoForm.videoName.length>1)
                //search for all video providers at the same time
                $scope.providers.forEach(function(provider)  {
                    searchVideo(provider, $scope.searchVideoForm.videoName, $scope.searchVideoForm.order.value);
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
            if($scope.searchVideoForm.selected===undefined)
                $scope.searchVideoForm.selected = $scope.searchVideoForm.playlist[$scope.searchVideoForm.playlist.length-1];
            console.log('$scope.searchVideoForm.selected: ',$scope.searchVideoForm.selected);
            console.log("Selected Video: ", $scope.searchVideoForm.selected.video);
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
    
        function searchVideo(provider, videoName, order) {
            videosService.searchVideo(provider, videoName, $scope.searchVideoForm.limit, order).then(function(data) {
                
                $scope.searchVideoForm.results[provider]=data;
                //calculate number of pages
                //$scope.searchVideoForm.pagination.numberOfPages = Math.round(data.totalResults/$scope.itemsByPage);
                
                if(provider === 'dailymotion') {
                    if($scope.searchVideoForm.results[provider].totalResults /10 > 100)
                        $scope.searchVideoForm.results[provider].totalPages = 100 * 10;
                    else
                        $scope.searchVideoForm.results[provider].totalPages = $scope.searchVideoForm.results[provider].totalResults;
                }
                alertsService.success(data.totalResults + " vidéos trouvées pour le fournisseur "+provider);     
            }, function(err) {
                alertsService.error("Impossile de récupérer des vidéo pour le fournisseur "+provider+". "+err);    
            });
        }
        
        $scope.isEmpty = function(object) {
            return Object.keys(object).length===0;
        };
        
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