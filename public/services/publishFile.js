define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('publishFileService',
        ['$http', '$q', '$window',
        function publishFileService($http, $q, $window) {
            
            var localData =  JSON.parse($window.localStorage.getItem('SocialUp'));
                        
            this.publishFromCloud = function(formData) {
                console.log("publishFromCloud with formData: ",formData);
                var deferred = $q.defer();                
                $http.post('/publishFromCloud/'+localData.user.id, formData)
                .then(function(response) {
                    console.log('response for ', response);
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