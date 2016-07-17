define ['./module'], (appModule) ->

  videosService = ($http, $q, $window) ->
    localData = JSON.parse $window.localStorage.getItem 'SocialUp'
    @getMedia = (provider) ->
      $http.get '/media/' + provider + '/' + localData.user.id
      .then (response) ->
        console.log 'getMedia response data: ', response.data
        response.data
      .catch (err) ->
        console.log 'err: ', err
        $q.reject err

    @searchVideo = (provider, videoName, limit, order, next) ->
      url = 'search/video/'+provider+'?videoName='+encodeURI(videoName)+'&limit='+limit
      if order
        url += "&order=" + order
      if next
        url += "&next=" + next
      $http.get(url)
      .then (response) ->
        console.log "searchVideo response data for provider: #{provider}", response.data
        response.data
      .catch (err) ->
        console.error "err: ", err
        $q.reject err

    return

  appModule.service 'videosService', ['$http', '$q', '$window', videosService]
