define(['angular'], function(angular) {

    'use strict';
    
    var YOUTUBE_API = 'https://www.youtube.com/iframe_api';
    var DAILYMOTION_API = 'https://api.dmcdn.net/all.js';
  
    angular.module('SocialUp.directives', [])  
    .directive('tsVideoPlayer', ['$document', '$window', '$timeout','$compile', '$q', function ($document, $window, $timeout, $compile, $q) {
       
        var document = $document[0];
        var player = {};
        var isVimeoListener=false;
        
        return {
            restrict : 'AE',
            scope : {
                videoId : '@videoId',
                videoProvider : '@videoProvider',
                autoPlay : '@autoPlay',
                width : '=',
                height : '=',
                pause : '@pause'
            },
            link: function(scope, element) {
             
                loadExternalAPIs().then(function() {
                    
                    console.log("external script added and loaded");
                    
                    var el = angular.element('<div id="videoPlayer"/>');
                    $compile(el)(scope);
                    element.append(el);
                    
                    switch(scope.videoProvider) {
                        case 'google' :
                        case 'youtube' :
                            createYoutubePlayer();
                            break;
                        case 'dailymotion' :                       
                            createDailymotionPlayer();
                            break;                        
                        case 'vimeo' :
                            createVimeoPlayer();
                            break;
                    }
                }, function(err) {
                    console.error("fail to load external APIs: ",err);
                });            

                scope.$watch('videoProvider', function (newValue, oldValue) {
                    if (newValue === oldValue) {
                        return;
                    }
                    //console.log("videoProvider changed from: ", oldValue+" to "+newValue);
                    switch(newValue) {
                        case 'google' :
                        case 'youtube' :
                            createYoutubePlayer();
                            break;
                        case 'dailymotion' :                       
                            createDailymotionPlayer();
                            break;
                        case 'vimeo' :
                            createVimeoPlayer();
                            break;
                    }
                });
        
                scope.$watch('videoId', function (newValue, oldValue) {
    
                    if (newValue === oldValue) {
                        return;
                    }
                   
                    if(scope.videoProvider === 'google' || scope.videoProvider === 'youtube') {
                        //console.log("load new google video");
                        if(!player.google || !player.google.loadVideoById) {
                            createYoutubePlayer();
                        } else {
                            
                            if(scope.autoPlay === 'true') {
                                console.log("google autoplay TRUE");
                                player.google.loadVideoById(scope.videoId);
                            } else {
                                console.log("google autoplay FALSE");
                                player.google.cueVideoById(scope.videoId);
                                
                            }
                        }
                        
                    } else if(scope.videoProvider==='dailymotion') {
                        if(!player.dailymotion)
                            createDailymotionPlayer();
                        else {
                            player.dailymotion.load(scope.videoId , { autoplay: scope.autoPlay === 'true' });
                        }
                        
                    } else if(scope.videoProvider==='vimeo') {        
                        createVimeoPlayer();
                    } else {
                        console.error(scope.videoProvider+" player not set ");
                    }
                    if(scope.autoPlay !== 'true')
                        $timeout(function() {
                            scope.$emit('videoPaused');
                        });
                });
                
                scope.$watch('pause', function (newValue, oldValue) {                   
                    
                    if (newValue === oldValue) {
                        return;
                    }
                    switch(scope.videoProvider) {
                        case 'google' :
                        case 'youtube' :
                            if(newValue === 'true')
                                player.google.pauseVideo();
                            else
                                player.google.playVideo();
                            break;
                
                        case 'dailymotion' :
                           if(newValue === 'true')
                                player.dailymotion.pause();
                            else
                                player.dailymotion.play();
                            break;
                            
                        case 'vimeo' :
                            if(newValue === 'true')
                                player.vimeo.post('pause');
                            else
                                player.vimeo.post('play');
                            break;
                    }
                });
                
                scope.$on('$destroy', function() {
                    player = {};
                });
                           
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
                            width: scope.width,
                            height: scope.height,
                            params: {
                                autoplay: scope.autoPlay === 'true',
                                mute: false,
                                api : '1'
                            }
                        });
                       
                        player.dailymotion.addEventListener("fullscreenchange", function() {
                            //fullScreen = player.dailymotion.fullscreen;
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
                        player.dailymotion.addEventListener("pause", function() {
                            //console.log("dailymotion video play");
                            scope.$emit('videoPaused');
                        });
                        
                        if(scope.autoPlay !== 'true')
                            scope.$emit('videoPaused');
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
                        height : scope.height,
                        width : scope.width,
                        videoId : scope.videoId,
                        events : {
                            'onReady': function(event) { 
                                if(scope.autoPlay === 'true') {
                                    event.target.playVideo();
                                    scope.$emit('videoStarted');
                                } else {
                                    scope.$emit('videoPaused');
                                }
                            },
                            'onStateChange': function(event) {
                                
                                switch(event.data) {
                                    case 0:
                                        scope.$emit('videoFinished');
                                        break;
                                    case 1:
                                        scope.$emit('videoStarted');
                                        break;
                                    case 2:
                                         scope.$emit('videoPaused');
                                        break;
                                }
                            }
                        }
                    });
                }
                
                // see https://developer.vimeo.com/player/js-api#universal-with-postmessage
                function createVimeoPlayer() {
                    
                    var playerOrigin = '*';
                    var el = angular.element('<iframe id="videoPlayer" src="https://player.vimeo.com/video/'+scope.videoId+'?api=1&player_id=videoPlayer" width="'+scope.width+'" height="'+scope.height+'"   frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen/>');
                    $compile(el)(scope);
                    element.children().remove();
                    element.append(el);
                    player.vimeo = document.getElementById('videoPlayer');
              
                    // Listen for messages from the player
                    if(!isVimeoListener) {
                        if (window.addEventListener ) {
                            window.addEventListener('message', onMessageReceived, false);
                            isVimeoListener=true;
                        } else {
                            window.attachEvent('onmessage', onMessageReceived, false);
                        }
                    }
            
                    function onMessageReceived(event) {
                        // Handle messages from the vimeo player only
                        if (!(/^https?:\/\/player.vimeo.com/).test(event.origin)) {
                            return false;
                        }
                        if (playerOrigin === '*') {
                            playerOrigin = event.origin;
                        }

                        var data = JSON.parse(event.data);

                        switch (data.event) {
                            case 'ready':
                                onReady();
                                break;
                            case 'play':
                                scope.$emit('videoStarted');
                                break;
                            case 'pause':
                                onPause();
                                scope.$emit('videoPaused');
                                break;
                            case 'finish':
                                scope.$emit('videoFinished');
                                break;
                        }
                    }
                    // Helper function for sending a message to the player
                    function post(action, value) {
                        var data = {
                          method: action
                        };
                        if (value) {
                            data.value = value;
                        }
                        var message = JSON.stringify(data);                   
                        player.vimeo.contentWindow.postMessage(message, playerOrigin);
                    }
                    
                    player.vimeo.post = post;
                    
                    function onReady() {                        
                        console.log('ready');
                        post('addEventListener', 'pause');
                        post('addEventListener', 'finish');
                        post('addEventListener', 'play');
                        //autoplay
                        if(scope.autoPlay === 'true')
                            post('play');
                        else
                            scope.$emit('videoPaused');
                    }

                    function onPause() {
                        console.log('paused');
                    }    
                }              
                            
                function createElement(src) {

                    var script = document.createElement('script');
                    script.src = src;
                    document.body.appendChild(script);
                    console.log("script added: ", script);
                    return script;
                }
                
                function loadExternalAPIs() {                  
                    
                    var promise;
                    if(typeof YT === 'undefined') {
                        promise = loadExternalAPI(YOUTUBE_API);
                    }
                    if(typeof DM === 'undefined') {
                        if(!promise)
                            promise = loadExternalAPI(DAILYMOTION_API);
                        else
                            promise = promise.then(function() {
                                return loadExternalAPI(DAILYMOTION_API);
                            });
                    }
                    //workaround
                    if(!promise) {
                        var deferred = $q.defer();
                        deferred.resolve();
                        promise= deferred.promise;
                    }
                    return promise;
                }

                function loadExternalAPI(src) {                  
                    
                    var deferred = $q.defer();
                    var element = createElement(src);
                    element.onload = element.onreadystatechange = function (e) {
 
                        if (element.readyState && element.readyState !== 'complete' && element.readyState !== 'loaded') {
                            return; //deferred.resolve(e);
                        }
                        $timeout(function () {
                            deferred.resolve(e);
                        });
                    };
                    element.onerror = function (e) {
                        deferred.reject(e);                       
                    };
                    return deferred.promise;                
                }
            }
        };
    }]);
});