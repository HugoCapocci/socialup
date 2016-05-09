define(['./module'], function(appModule) {
  var authService;
  authService = function($rootScope, $http, $q, $window, $resource) {

    /*data = $resource 'http://jsonplaceholder.typicode.com/users/:user', user: '@user', update: method:'PUT'
    return data
     */
    this.getProviderURL = function(provider) {
      var deferred;
      deferred = $q.defer();
      $http.get('/oauthURL/' + provider + '/' + $rootScope.user.id).then(function(response) {
        return deferred.resolve(response.data);
      })["catch"](function(err) {
        console.log('err: ', err);
        return deferred.reject(err);
      });
      return deferred.promise;
    };
    this.authenticate = function(login, hashedPassword) {
      var deferred;
      deferred = $q.defer();
      $http.get('/authenticate/?login=' + login + '&password=' + hashedPassword).then(function(response) {
        var userData;
        userData = {
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          login: response.data.login,
          id: response.data._id,
          providers: response.data.providers
        };
        return deferred.resolve(userData);
      })["catch"](function(err) {
        return deferred.reject(err);
      });
      return deferred.promise;
    };
    this.createUser = function(firstName, lastName, login, hashedPassword) {
      var deferred;
      deferred = $q.defer();
      $http.post('/user/create', {
        firstName: firstName,
        lastName: lastName,
        login: login,
        password: hashedPassword
      }).then(function(response) {
        console.log('response for ', response);
        return deferred.resolve(response.data);
      })["catch"](function(err) {
        console.log('err: ', err);
        return deferred.reject(err);
      });
      return deferred.promise;
    };
    this.getUserTokens = function() {
      return $rootScope.tokens;
    };
    this.deleteToken = function(provider) {
      var deferred;
      deferred = $q.defer();
      $http["delete"]('/token/' + provider + '/' + $rootScope.user.id).then(function(response) {
        console.log('response for eventService.deleteEvent: ', response);
        return deferred.resolve();
      })["catch"](function(err) {
        console.log('err in eventService.deleteEvent: ', err);
        return deferred.reject(err);
      });
      return deferred.promise;
    };
    this.refreshToken = function(provider) {
      var deferred;
      deferred = $q.defer();
      $http.get('/refreshToken/' + provider + '/' + $rootScope.user.id).then(function(response) {
        console.log('response for eventService.refreshToken: ', response);
        return deferred.resolve();
      })["catch"](function(err) {
        console.log('err in eventService.refreshToken: ', err);
        return deferred.reject(err);
      });
      return deferred.promise;
    };
    this.resetPassword = function(userEmail) {
      var deferred;
      deferred = $q.defer();
      $http.post('/user/resetPassword/' + userEmail, {}).then(function(response) {
        console.log('response for ', response);
        return deferred.resolve(response.data);
      })["catch"](function(err) {
        console.log('err: ', err);
        return deferred.reject(err);
      });
      return deferred.promise;
    };
  };
  return appModule.service('authService', ['$rootScope', '$http', '$q', '$window', '$resource', authService]);
});
