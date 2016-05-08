define ['./module'], (appModule) ->

  videosService = ($http, $q, $window) ->
    localData = JSON.parse $window.localStorage.getItem 'SocialUp'
    @getMedia = (provider) ->
      deferred = $q.defer()
      $http.get('/media/'+provider+'/'+localData.user.id)
      .then (response) ->
        console.log 'getMedia response data: ', response.data
        deferred.resolve response.data
      , (err) ->
        console.log "err: ", err
        deferred.reject err
      deferred.promise

    @searchVideo = (provider, videoName, limit, order, next) ->
      deferred = $q.defer()
      url = 'search/video/'+provider+'?videoName='+encodeURI(videoName)+'&limit='+limit
      if order
        url += "&order=" + order
      if next
        url += "&next=" + next
      $http.get(url)
      .then (response) ->
        console.log "searchVideo response data for provider: #{provider}", response.data
        deferred.resolve(response.data)
      , (err) ->
        console.error "err: ", err
        deferred.reject err
      deferred.promise

    return

  appModule.service 'videosService', ['$http', '$q', '$window', videosService]
