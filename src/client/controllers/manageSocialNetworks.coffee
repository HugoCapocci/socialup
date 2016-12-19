define ['./module', 'moment'], (appModule, moment) ->

  class ManageSocialNetworksController

    constructor: (@$scope, @$window, @$timeout, @authService, @userService, @alertsService) ->
      @$scope.socialTokens = []
      @$scope.oauthURLS = {}
      @$scope.providers = [
        'dailymotion'
        'google'
        'facebook'
        'dropbox'
        'twitter'
        'linkedin'
        'vimeo'
        'mixcloud'
        'soundcloud'
      ]
      @userData = null
      @userService.getData()
      .then (data) =>
        @userData = data
        Object.keys(@userData.providers).map (provider) =>
          if @userData.providers[provider].tokens and @userData.providers[provider].tokens.expiry_date?
            @userData.providers[provider].tokens.expiry_date = moment(@userData.providers[provider].tokens.expiry_date).format 'dddd D MMMM YYYY à HH:mm'

        @$scope.socialTokens= @userData.providers
        @$scope.providers.forEach (provider) =>
          @authService.getProviderURL(provider)
          .then (url) =>
            @$scope.oauthURLS[provider] = url
            if @userData?
              #workaround for mixcloud (doesn't store the state)
              if provider is 'mixcloud'
                @$scope.oauthURLS[provider] += '?state=' + @userData.id
              else
                @$scope.oauthURLS[provider] += '&state=' + @userData.id

    verifyTwitter: ->
      oauthVerifier = @$scope.user.verificationCode
      @authService.getTwitterAccessToken oauthVerifier
      .then (data) ->
        console.log 'verification OK, data? ', data
      .catch (err) =>
        console.log 'verification KO, err? ', err
        @alertsService.error 'Erreur d\'authentification twitter: ' + err

    deleteToken: (provider) ->
      @authService.deleteToken provider
      .then =>
        @alertsService.success "Jeton d'authentification pour le fournisseur #{provider} supprimé"
        @userService.deleteToken provider
        @getUserData()
      .catch (err) =>
        console.log 'delete token error: ', err
        @alertsService.error 'impossible d\'effacer le jeton : '+err

    generateToken: (provider) ->
      @authService.getProviderURL(provider)
      .then (url) =>
        oauthWindow = @$window.open url + '&state=' + @userData.id, 'C-Sharpcorner', 'width=600,height=500'
        @$timeout =>
          @refreshOnClose oauthWindow
        , 2000

    refreshToken: (provider) ->
      @authService.refreshToken(provider)
      .then =>
        @$timeout =>
          @getUserData()
        , 1500

    refreshOnClose: (oauthWindow) ->
      if oauthWindow isnt null and oauthWindow.closed
        console.log 'window is closed,  refresh'
        @getUserData()
      else
        console.log 'repeat, oauthWindow not null, closed?: ', oauthWindow.closed
        @$timeout =>
          @refreshOnClose oauthWindow
        , 2000

    getUserData: ->
      @userService.getData()
      .then (data) =>
        @userData = data
        console.log '@userData.tokens founds: ', @userData.tokens
        Object.keys(@userData.providers).map (provider) =>
          console.log 'provider: ', provider
          console.log 'token: ', @userData.providers[provider].tokens
          if @userData.providers[provider].tokens and @userData.providers[provider].tokens.expiry_date?
            console.log 'token expiry_date found'
            @userData.providers[provider].tokens.expiry_date = moment(@userData.providers[provider].tokens.expiry_date).format 'dddd D MMMM YYYY à HH:mm'
        @$scope.socialTokens = @userData.providers

  ManageSocialNetworksController.$inject = ['$scope', '$window', '$timeout', 'authService', 'userService', 'alertsService']
  appModule.controller 'ManageSocialNetworksController', ManageSocialNetworksController
