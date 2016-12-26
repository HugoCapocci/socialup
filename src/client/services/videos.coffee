define ['./module'], (appModule) ->

  videosService = ($http, $q, $window, $rootScope) ->
    localData = JSON.parse $window.localStorage.getItem 'SocialUp'
    @getMedia = (provider) ->
      $http.get '/media/' + provider + '/' + localData.user.id
      .then (response) ->
        console.log 'getMedia response data: ', response.data
        response.data
      .catch (err) ->
        console.log 'err: ', err
        $q.reject err

    @getYoutubeSubscription = ->
      url = 'youtubeSubscription/' + $rootScope.user.id
      $http.get(url)
      .then (response) ->
        console.log 'subscriptions: ', response.data
        return response.data
      .catch (error) ->
        console.error 'error: ', error
        $q.reject error

    @searchVideo = (provider, videoName, limit, order, next) ->
      console.log 'user? ', $rootScope.user
      url = 'search/video/' + provider + '?videoName=' + encodeURIComponent(videoName) + '&limit=' + limit
      if order
        url += '&order=' + order
      if next
        url += '&next=' + next
      if $rootScope.user
        url += '&userId=' + $rootScope.user.id
      #@getYoutubeSubscription()
      #.then ->
      $http.get(url)
      .then (response) ->
        console.log "searchVideo response data for provider: #{provider}", response.data
        response.data
      .catch (error) ->
        console.error 'error: ', error
        $q.reject error

    return

  appModule.service 'videosService', ['$http', '$q', '$window', '$rootScope', videosService]
