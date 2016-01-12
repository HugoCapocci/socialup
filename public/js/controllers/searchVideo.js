define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
    
    appModule.controller('SearchVideoController',
    ['$scope', '$location', 'videosService', 'alertsService', 
    function($scope,  $location, videosService, alertsService) {
        
        $scope.searchVideoForm =  {
            orders : ["date", "rating"/* best ratio like/dislike on youtube */, "relevance", "title", "viewCount"],
            order : "relevance",
            selected : null
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
        
         $scope.setSelected = function(provider, $index) {
            $scope.searchVideoForm.selected = {
                video : $scope.videos[provider][$index],
                provider : provider
            };                 
            console.log("Selected Video: ", $scope.searchVideoForm.selected.video);
        };
       
        function searchVideo(provider, videoName, order) {
            videosService.searchVideo(provider, videoName, order).then(function(data) {
                $scope.videos[provider]=data.videos;
                alertsService.success(data.totalResults+ " vidéos trouvées pour le fournisseur "+provider);     
            }, function(err) {
                alertsService.error("Impossile e récupérer des vidéo pour le fournisseur "+provider+". "+err);    
            });
        }
        
    }]);
    
});