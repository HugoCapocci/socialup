define ['./module'], (appModule) ->

  authService = ($rootScope, $http, $q, $window, $resource) ->
    ###data = $resource 'http://jsonplaceholder.typicode.com/users/:user', user: '@user', update: method:'PUT'
    return data###

    @getProviderURL = (provider) ->
      $http.get '/oauthURL/' + provider + '/' + $rootScope.user.id
      .then (response) ->
        response.data
      .catch (err) ->
        console.log 'err: ', err
        $q.reject err

    @authenticate = (login, hashedPassword) ->
      $http.get '/authenticate/?login=' + login + '&password=' + hashedPassword
      .then (response) ->
        firstName: response.data.firstName
        lastName: response.data.lastName
        login: response.data.login
        id: response.data._id
        providers: response.data.providers
      .catch (err) ->
        console.error 'err: ', err
        $q.reject err

    @createUser = (firstName, lastName, login, hashedPassword) ->
      $http.post '/user/create', {firstName: firstName, lastName: lastName, login: login, password: hashedPassword}
      .then (response) ->
        console.log 'response for ', response
        response.data
      .catch (err) ->
        console.log 'err: ', err
        $q.reject err

    @getUserTokens = ->
      $rootScope.tokens

    @deleteToken = (provider) ->
      $http.delete '/token/' + provider + '/' + $rootScope.user.id
      .then (response) ->
        console.log 'response for eventService.deleteEvent: ', response
        return
      .catch (err) ->
        console.log 'err in eventService.deleteEvent: ', err
        $q.reject err

    @refreshToken = (provider) ->
      $http.get '/refreshToken/' + provider + '/' + $rootScope.user.id
      .then (response) ->
        console.log 'response for eventService.refreshToken: ', response
        return
      .catch (err) ->
        console.log 'err in eventService.refreshToken: ', err
        $q.reject err

    @getUser = (userId) ->
      $http.get '/user/' + userId
      .then (response) ->
        firstName: response.data.firstName
        lastName: response.data.lastName
        login: response.data.login
        id: userId

    @changePassword = (id, newPassword) ->
      $http.post '/user/updatePassword/' + id, newPassword: newPassword
      .then (response) ->
        console.log 'response for ', response
        response.data
      .catch (err) ->
        console.log 'err: ', err
        $q.reject err

    @resetPassword = (userEmail) ->
      $http.post '/user/resetPassword/' + userEmail, {}
      .then (response) ->
        console.log 'response for ', response
        response.data
      .catch (err) ->
        console.log 'err: ', err
        $q.reject err

    return

  appModule.service 'authService', ['$rootScope', '$http', '$q', '$window', '$resource', authService]
