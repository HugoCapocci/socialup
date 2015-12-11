define(['./module'], function (appModule) {

    'use strict';
    
    appModule.service('categoriesService',
        ['$http', '$q', '$window',
        function categoriesService($http, $q, $window) {
                                 
            this.getCategories = function() {
                var deferred = $q.defer();
                $http.get('/categories/google')
                .then(function(response) {
                    console.log('response for google getCategories: ', response);
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