define(['./module'], function(appModule) {
  var userService;
  userService = function($rootScope, $http, $q, $window) {
    var getUserData, setUserData;
    getUserData = function() {
      var userData;
      userData = $window.localStorage.getItem('SocialUp');
      if (userData) {
        return JSON.parse(userData).user;
      } else {
        return void 0;
      }
    };
    this.getUserData = function() {
      var userData;
      userData = getUserData();
      $rootScope.user = userData;
      return userData;
    };
    setUserData = function(userData) {
      return $window.localStorage.setItem('SocialUp', JSON.stringify({
        user: userData,
        timestamp: new Date().getTime()
      }));
    };
    this.getData = function() {
      var deferred;
      deferred = $q.defer();
      $http.get('/user/' + getUserData().id).then(function(response) {
        var userData;
        userData = {
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          login: response.data.login,
          id: response.data._id,
          providers: response.data.providers
        };
        setUserData(userData);
        $rootScope.user = userData;
        return deferred.resolve(userData);
      }, function(err) {
        return deferred.reject(err);
      });
      return deferred.promise;
    };
    this.setData = function(userData) {
      setUserData(userData);
      return $rootScope.user = userData;
    };
    this.deleteData = function() {
      $window.localStorage.removeItem('SocialUp');
      delete $rootScope.user;
    };
    this.getActiveProviders = function() {
      var userData;
      userData = getUserData();
      console.log("Active providers: ", userData.providers);
      Object.keys(userData.providers).map(function(provider) {
        if (!userData.providers[provider].tokens) {
          return delete userData.providers[provider];
        }
      });
      return userData.providers;
    };
    this.deleteToken = function(provider) {
      var userData;
      userData = getUserData();
      delete userData.providers[provider];
      console.log("delete provider " + provider + " in local data ", userData);
      setUserData(userData);
      return $rootScope.user = userData;
    };
  };
  return appModule.service('userService', ['$rootScope', '$http', '$q', '$window', userService]);
});
