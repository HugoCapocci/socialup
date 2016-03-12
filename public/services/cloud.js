define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('cloudService', 
        ['$http', '$q', '$window',
        function cloudService($http, $q, $window) {
            
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));

            //authentication is made by provider callbacks
            this.getFolders = function(provider, parentFolder) {
                return retrieveFiles(provider, parentFolder, 'folder');
            };
            
            this.getFiles = function(provider, parentFolder) {
                return retrieveFiles(provider, parentFolder);
            };
            
            function retrieveFiles(provider, parentFolder, typeFilter) {
                var deferred = $q.defer();
                if(parentFolder===undefined)
                    parentFolder='root';
                
                if(provider==='dropbox') {
                    parentFolder = encodeURIComponent(parentFolder);
                    // console.log("encoded path ", parentFolder);
                }
                var path = '/cloudExplorer/'+provider+'/'+parentFolder+'/'+localData.user.id;
                if(typeFilter!==undefined)
                    path+='/?typeFilter='+typeFilter;
                
                $http.get(path).then(function(response) {
                    //console.log('response for folderId '+parentFolder+': ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            }
            
            this.getFile = function(provider, fileId) {
          
                var deferred = $q.defer();
                $http.get('/file/'+provider+'/'+fileId+'/'+localData.user.id).then(function(response) {
                    console.log('response getFile ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.getDownloadFileURL = function(provider, fileId) {                
                return '/file/'+provider+'/'+fileId+'/'+localData.user.id;
            };
            
            this.uploadChained = function(provider, eventId, folderId) {
                var deferred = $q.defer();
                $http.post('/event/chained/'+provider+'/'+eventId+'/'+localData.user.id, {eventParams : [folderId], eventType: 'uploadCloud'}).then(function(response) {
                    console.log('response for folderId '+folderId+': ', response);
                    deferred.resolve(response.data);
                }, function (err) {
                    console.log("err: ", err);
                    deferred.reject(err);
                });
                return deferred.promise;
            };
            
            this.getSpaceUsage = function(provider) {
                return $http.get('/spaceUsage/'+provider+'/'+localData.user.id);
            };
            
            this.deleteFile = function(provider, fileId) {
                return $http.delete('/file/'+provider+'/'+encodeURIComponent(fileId)+'/'+localData.user.id);
            };
        }]
    );
});