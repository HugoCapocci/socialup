define ['./module'], (appModule) ->

  userService = ($rootScope, $http, $q, $window) ->
    getUserData = ->
      userData = $window.localStorage.getItem 'SocialUp'
      if userData
        JSON.parse(userData).user
      else
        undefined

    @getUserData = ->
      userData = getUserData()
      $rootScope.user = userData
      userData

    setUserData = (userData) ->
      $window.localStorage.setItem 'SocialUp', JSON.stringify user: userData, timestamp: new Date().getTime()

    @getData = ->
      $http.get '/user/' + getUserData().id
      .then (response) ->
        userData =
          firstName: response.data.firstName
          lastName: response.data.lastName
          login: response.data.login
          hashedLogin: response.data.hashedLogin
          id: response.data._id
          providers: response.data.providers
        setUserData userData
        $rootScope.user = userData
        userData
      .catch (err) ->
        $q.reject err

    @setData = (userData) ->
      setUserData userData
      $rootScope.user = userData

    @deleteData = ->
      $window.localStorage.removeItem 'SocialUp'
      delete $rootScope.user
      return

    @getActiveProviders = ->
      userData = getUserData()
      return [] unless userData
      console.log 'Active providers: ', userData.providers
      Object.keys(userData.providers).map (provider) ->
        delete userData.providers[provider] unless userData.providers[provider].tokens
      userData.providers

    @deleteToken = (provider) ->
      userData = getUserData()
      delete userData.providers[provider]
      console.log "delete provider #{provider} in local data ", userData
      setUserData userData
      $rootScope.user = userData

    return

  appModule.service 'userService', ['$rootScope', '$http', '$q', '$window', userService]
