define(['./module'], function(appModule) {
  var videosService;
  videosService = function($http, $q, $window) {
    var localData;
    localData = JSON.parse($window.localStorage.getItem('SocialUp'));
    this.getMedia = function(provider) {
      var deferred;
      deferred = $q.defer();
      $http.get('/media/' + provider + '/' + localData.user.id).then(function(response) {
        console.log('getMedia response data: ', response.data);
        return deferred.resolve(response.data);
      }, function(err) {
        console.log("err: ", err);
        return deferred.reject(err);
      });
      return deferred.promise;
    };
    this.searchVideo = function(provider, videoName, limit, order, next) {
      var deferred, url;
      deferred = $q.defer();
      url = 'search/video/' + provider + '?videoName=' + encodeURI(videoName) + '&limit=' + limit;
      if (order) {
        url += "&order=" + order;
      }
      if (next) {
        url += "&next=" + next;
      }
      $http.get(url).then(function(response) {
        console.log("searchVideo response data for provider: " + provider, response.data);
        return deferred.resolve(response.data);
      }, function(err) {
        console.error("err: ", err);
        return deferred.reject(err);
      });
      return deferred.promise;
    };
  };
  return appModule.service('videosService', ['$http', '$q', '$window', videosService]);
});
