define ['./module'], (appModule) ->

  userService = ($rootScope, $http, $q, $window) ->
    getUserData = ->
      userData = $window.localStorage.getItem 'SocialUp'
      if userData
        return JSON.parse(userData).user
      else
        undefined

    @getUserData = ->
      userData = getUserData()
      $rootScope.user = userData
      userData

    setUserData = (userData) ->
      $window.localStorage.setItem 'SocialUp', JSON.stringify user: userData, timestamp: new Date().getTime()

    @getData = ->
      deferred = $q.defer()
      $http.get '/user/'+getUserData().id
      .then (response) ->
        userData =
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          login: response.data.login,
          id: response.data._id,
          providers: response.data.providers
        setUserData userData
        $rootScope.user = userData
        deferred.resolve userData
      , (err) ->
        deferred.reject err
      deferred.promise

    @setData = (userData) ->
      setUserData userData
      $rootScope.user = userData

    @deleteData = ->
      $window.localStorage.removeItem 'SocialUp'
      delete $rootScope.user;
      #$location.path('/login');
      return

    @getActiveProviders = ->
      userData = getUserData()
      console.log "Active providers: ", userData.providers
      Object.keys(userData.providers).map (provider) ->
        if not userData.providers[provider].tokens
          delete userData.providers[provider]
      userData.providers

    @deleteToken = (provider) ->
      userData = getUserData()
      delete userData.providers[provider]
      console.log "delete provider #{provider} in local data ", userData
      setUserData userData
      $rootScope.user = userData

    return

  appModule.service 'userService', ['$rootScope', '$http', '$q', '$window', userService]
