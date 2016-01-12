define(['angular'], function(angular) {

    'use strict';
    //console.log("directives loaded: ");
  
    angular.module('SocialUp.directives', [])  
    .directive('tsVideoPlayer', ['$window', '$compile', function ($window, $compile) {
       
        var player = {};
        
        var fullScreen = false;
        
        return {
            restrict : 'A',
            scope : {
                videoId : '@videoId',
                videoProvider : '@videoProvider'
            },
            link: function (scope, element) {
                
                var el = angular.element('<div id="videoPlayer"/>');
                $compile(el)(scope);
                element.append(el);
                                
                scope.$watch('videoProvider', function (newValue, oldValue) {
                    if (newValue == oldValue) {
                        return;
                    }
                    console.log("videoProvider changed from: ", oldValue+" to "+newValue);
                    switch(newValue) {
                        case 'google' :
                            createYoutubePlayer();
                            break;

                        case 'dailymotion' :                       
                            createDailymotionPlayer();
                            break;                        
                    }
                });
               
                scope.$watch('videoId', function (newValue, oldValue) {
    
                    if (newValue == oldValue) {
                        return;
                    }
                    console.log("videoId changed from: ", oldValue+" to "+newValue);
                    console.log("scope.videoProvider: ",scope.videoProvider);
                    
                    if(scope.videoProvider === 'google') {
                        console.log("load new google video");
                        if(!player.google || !player.google.loadVideoById) {
                            console.log("load new youtube player");
                            createYoutubePlayer();
                        } else {
                            console.log("reuse youtube player, YT.loaded? ",YT.loaded);
                            console.log("player.google: ",player.google);
                            player.google.loadVideoById(scope.videoId);
                        }
                        
                    } else if(scope.videoProvider==='dailymotion') {
                        if(!player.dailymotion)
                            createDailymotionPlayer();
                        else {
                            player.dailymotion.load(scope.videoId);
                            player.dailymotion.setFullscreen(fullScreen);
                        }
                        
                    } else {
                        console.error(scope.videoProvider+" player not set ");
                    }
                });
                
                switch(scope.videoProvider) {
                    case 'google' :
                        createYoutubePlayer();
                        break;
                        
                    case 'dailymotion' :                       
                        createDailymotionPlayer();
                        break;                        
                }            
              
                function createDailymotionPlayer() {
                
                    delete player.google;
                    if(!DM){
                        console.log('DM playerNotLoaded');
                    } else {
                        console.log('Creating dailymotion player for element: ',element.attr('id'));
                        //angular.element(element.attr('id')).empty();
                        //element= element.empty();
                        player.dailymotion = DM.player(document.getElementById("videoPlayer"), {
                            video: scope.videoId,
                            width: "640",
                            height: "390",
                            params: {
                                autoplay: true,
                                mute: false
                            }
                        });
                    }
                }
                
                function createYoutubePlayer() {
                    
                    //workaround
                    var el = angular.element('<div id="videoPlayer"/>');
                    $compile(el)(scope);
                    element.children().remove();
                    element.append(el);
                    delete player.dailymotion;
                    console.log("YT.loaded? ",YT.loaded);
                    if(!YT){
                        console.log('YT playerNotLoaded');
                        $window.onYouTubePlayerAPIReady = onYouTubePlayerAPIReady;
                    } else if(YT.loaded){
                        onYouTubePlayerAPIReady();
                    }else{
                        YT.ready(onYouTubePlayerAPIReady);
                    }
                }
                
                function onYouTubePlayerAPIReady(){
                    console.log('Creating youtube player for element: ', element);
                    console.log("onYouTubePlayerAPIReady, scope.videoId: ",scope.videoId);

                    player.google = new YT.Player(document.getElementById("videoPlayer"), {
                        height : '390',
                        width : '640',
                        videoId : scope.videoId,
                        events : {
                            'onReady': function(event) {
                                console.log("play video youtube");
                                event.target.playVideo();
                            },
                            'onStateChange': function(event) {
                                console.log('onPlayerStateChange, event: ', event);
                                if (event.data === 0) {
                                    console.log('finished');
                                    alert('done');
                                }
                            }
                        }
                    });
                }
            }
        };
    }]);
});