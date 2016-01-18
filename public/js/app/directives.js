define(['angular'], function(angular) {

    'use strict';
    
    var YOUTUBE_API = 'https://www.youtube.com/iframe_api';
    var DAILYMOTION_API = 'https://api.dmcdn.net/all.js';
  
    angular.module('SocialUp.directives', [])  
    .directive('tsVideoPlayer', ['$document', '$window', '$timeout','$compile', '$q', function ($document, $window, $timeout, $compile, $q) {
       
        var document = $document[0];
        var player = {};
        var width = "830", height = "530";
        
        return {
            restrict : 'AE',
            scope : {
                videoId : '@videoId',
                videoProvider : '@videoProvider'
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
                    if (newValue == oldValue) {
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
                        }
                        
                    } else if(scope.videoProvider==='vimeo') {
                        createVimeoPlayer();                    
                    } else {
                        console.error(scope.videoProvider+" player not set ");
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
                            width: width,
                            height: height,
                            params: {
                                autoplay: true,
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
                        height : height,
                        width : width,
                        videoId : scope.videoId,
                        events : {
                            'onReady': function(event) {                                
                                event.target.playVideo();
                                scope.$emit('videoStarted');
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
                    
                    var playerOrigin = '*';
                    var el = angular.element('<iframe id="videoPlayer" src="https://player.vimeo.com/video/'+scope.videoId+'?api=1&player_id=videoPlayer" width="'+width+'" height="'+height+'"   frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen/>');
                    $compile(el)(scope);
                    element.children().remove();
                    element.append(el);
                    player.vimeo = document.getElementById('videoPlayer');
              
                    // Listen for messages from the player
                    if (window.addEventListener) {
                        window.addEventListener('message', onMessageReceived, false);
                    }
                    else {
                        window.attachEvent('onmessage', onMessageReceived, false);
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

                            case 'playProgress':
                                onPlayProgress(data.data);
                                break;

                            case 'pause':
                                onPause();
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

                    function onReady() {
                        console.log('ready');

                        post('addEventListener', 'pause');
                        post('addEventListener', 'finish');
                        //post('addEventListener', 'playProgress');
                        //autoplay
                        post('play');
                        scope.$emit('videoStarted');
                    }

                    function onPause() {
                        console.log('paused');
                    }

                    function onPlayProgress(data) {
                        console.log(data.seconds + 's played');
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