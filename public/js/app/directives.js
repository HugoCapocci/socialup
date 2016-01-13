define(['angular'], function(angular) {

    'use strict';
    
    function launchIntoFullscreen(element) {
      if(element.requestFullscreen) {
        element.requestFullscreen();
      } else if(element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if(element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if(element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    }
  
    angular.module('SocialUp.directives', [])  
    .directive('tsVideoPlayer', ['$window', '$timeout','$compile', function ($window, $timeout, $compile) {
       
        var player = {};
        var fullScreen = false;
        
        return {
            restrict : 'AE',
            scope : {
                videoId : '@videoId',
                videoProvider : '@videoProvider'
            },
            link: function(scope, element) {
                
                var el = angular.element('<div id="videoPlayer"/>');
                $compile(el)(scope);
                element.append(el);

                scope.$watch('videoProvider', function (newValue, oldValue) {
                    if (newValue == oldValue) {
                        return;
                    }
                    //console.log("videoProvider changed from: ", oldValue+" to "+newValue);
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
                    //console.log("videoId changed from: ", oldValue+" to "+newValue);
                    //console.log("scope.videoProvider: ",scope.videoProvider);
                    if(scope.videoProvider === 'google') {
                        //console.log("load new google video");
                        if(!player.google || !player.google.loadVideoById) {
                            //console.log("load new youtube player");
                            createYoutubePlayer();
                        } else {
                            //console.log("reuse youtube player, YT.loaded? ",YT.loaded);
                            //console.log("player.google: ",player.google);
                            player.google.loadVideoById(scope.videoId);
                        }
                    } else if(scope.videoProvider==='dailymotion') {
                        if(!player.dailymotion)
                            createDailymotionPlayer();
                        else {
                            player.dailymotion.load(scope.videoId);
                            player.dailymotion.setFullscreen(true);
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
                    case 'vimeo' :
                        createVimeoPlayer();
                        break;
                }
                function createDailymotionPlayer() {

                    var el = angular.element('<div id="videoPlayer"/>');
                    $compile(el)(scope);
                    element.children().remove();
                    element.append(el);
                    
                    delete player.google;
                    if(!DM){
                        console.log('DM playerNotLoaded');
                    } else {
                        player.dailymotion = DM.player(document.getElementById("videoPlayer"), {
                            video: scope.videoId,                           
                            width: "640",
                            height: "390",
                            params: {
                                autoplay: true,
                                mute: false,
                                api : '1'
                            }
                        });
                       
                        player.dailymotion.addEventListener("fullscreenchange", function() {
                            fullScreen = player.dailymotion.fullscreen;
                        });
                        player.dailymotion.addEventListener("ended", function() {
                            scope.$emit('videoFinished');
                        });        
                        player.dailymotion.addEventListener("apiready", function() {
                           //console.log("dailymotion player ready for API");
                        });
                        player.dailymotion.addEventListener("playing", function() {
                            //console.log("dailymotion video play");
                            scope.$emit('videoStarted');
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
                    } else {
                        YT.ready(onYouTubePlayerAPIReady);
                    }
                }
                
                function onYouTubePlayerAPIReady() {

                    player.google = new YT.Player(document.getElementById("videoPlayer"), {
                        height : '390',
                        width : '640',
                        videoId : scope.videoId,
                        events : {
                            'onReady': function(event) {
                                scope.$emit('videoStarted');
                                event.target.playVideo();
                            },
                            'onStateChange': function(event) {
                                if (event.data === 0) {
                                    scope.$emit('videoFinished');
                                }
                            }
                        }
                    });
                }
                
                // see https://developer.vimeo.com/player/js-api#universal-with-postmessage
                function createVimeoPlayer() {
                    
                    var el = angular.element('<iframe id="videoPlayer"/>');
                    $compile(el)(scope);
                    element.children().remove();
                    element.append(el);
                    
                    
                    /*<iframe id="player1" 
                    src="https://player.vimeo.com/video/76979871?api=1&player_id=player1" 
                    width="630" 
                    height="354" 
                    frameborder="0" 
                    webkitallowfullscreen 
                    mozallowfullscreen 
                    allowfullscreen
                        ></iframe>*/
                    
                }
            }
        };
    }]);
});