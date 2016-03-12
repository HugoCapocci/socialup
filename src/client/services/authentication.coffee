define ['./module'], (appModule) ->

  appModule.service 'authService', ['$rootScope', '$http', '$q', '$window', '$resource', authService]

  authService = ($rootScope, $http, $q, $window, $resource) ->

    data = $resource('http://jsonplaceholder.typicode.com/users/:user', {user: '@user'}, {
      update:{
        method:'PUT'
      }
    });
    return data;

    @.getProviderURL = (provider) ->

      deferred = $q.defer()
      $http.get '/oauthURL/'+provider+'/'+$rootScope.user.id
      .then (response) ->
        deferred.resolve response.data
      .catch (err) ->
        console.log("err: ", err)
        deferred.reject err
      deferred.promise

    @.authenticate = (login, hashedPassword) ->

      deferred = $q.defer();
      $http.get('/authenticate/?login='+login+"&password="+hashedPassword)
      .then (response) ->
        userData =
          firstName :  response.data.firstName
          lastName :  response.data.lastName
          login :  response.data.login
          id : response.data._id
          providers : response.data.providers
        deferred.resolve userData
      .catch  (err) ->
        deferred.reject(err)
      deferred.promise

    @.createUser = (firstName, lastName, login, hashedPassword) ->

      deferred = $q.defer()
      $http.post '/user/create', {firstName: firstName, lastName: lastName, login:login, password:hashedPassword}
      .then (response) ->
        console.log 'response for ', response
        deferred.resolve response.data
      .catch (err) ->
        console.log "err: ", err
        deferred.reject err
      deferred.promise

    @.getUserTokens = ->
      $rootScope.tokens

    @.deleteToken = (provider) ->

      deferred = $q.defer()
      $http.delete '/token/'+provider+'/'+$rootScope.user.id
      .then (response) ->
        console.log 'response for eventService.deleteEvent: ', response
        deferred.resolve()
      .catch (err) ->
        console.log 'err in eventService.deleteEvent: ', err
        deferred.reject err
      deferred.promise

  @.refreshToken = (provider) ->

    deferred = $q.defer()
    $http.get '/refreshToken/'+provider+'/'+$rootScope.user.id
    .then (response) ->
      console.log 'response for eventService.refreshToken: ', response
      deferred.resolve()
    .catch (err) ->
      console.log 'err in eventService.refreshToken: ', err
      deferred.reject err
    deferred.promise

  @.resetPassword = (userEmail) ->

      deferred = $q.defer()
      $http.post '/user/resetPassword/'+userEmail, {}
      .then (response) ->
          console.log 'response for ', response
          deferred.resolve response.data
      .catch (err) ->
          console.log "err: ", err
          deferred.reject err
      deferred.promise
