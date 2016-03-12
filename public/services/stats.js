define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('statsService', 
        ['$http', '$q', '$window',
        function($http, $q, $window) {
            
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
            
            this.getPages = function(provider, pageName) {
                
                var deferred = $q.defer();
                console.log("search page name: ", pageName);
                pageName = encodeURI(pageName);                
                var url = '/searchPage/'+provider+'/'+pageName;
                if(localData && localData.user)
                    url+='?userId='+localData.user.id;
                $http.get(url).then(function(response) {
                    console.log('response for searchPage: ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.getPageMetrics = function(provider, metricType, pageId, dateSince, dateUntil) {
               
                var deferred = $q.defer();
                var url = '/pageMetrics/'+provider+'/'+metricType+'/'+pageId;
                if(dateSince && dateUntil)
                    url+='?since='+dateSince+"&until="+dateUntil;
                if(localData && localData.user)
                    url+='&userId='+localData.user.id;
                
                $http.get(url).then(function(response) {
                    console.log('response for facebook getPageMetrics: ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    //console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
        }]
                      
    );
    
});