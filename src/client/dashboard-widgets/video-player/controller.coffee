define ['../module', 'moment'], (appModule, moment) ->

  SearchVideoController = ($scope, $window, $location, $sce, videosService, alertsService) ->
    $scope.searchVideoForm =
      orders: [
        {value: "relevance", label: "Pertinence"}
        {value: "date", label: "Plus récent"}
        {value: "rating", label: "Meilleur ratio"}
        {value: "viewCount", label: "Plus de vues"}
      ]
      playlist: []
      results: {}
      limit: 10
      autoplay: true
      loop: true
      isReading: false
      isPaused: false
      provider: {}
      changePage: (provider) ->
        console.log "change page to ", $scope.searchVideoForm.provider[provider].currentPage
        searchVideo provider, $scope.searchVideoForm.provider[provider].currentPage

      changeStep: (provider, step) ->
        console.log "changeStep: ", step
        if step is 'forward'
          pageToken = $scope.searchVideoForm.results[provider].nextPageToken
        else
          pageToken = $scope.searchVideoForm.results[provider].prevPageToken
        searchVideo(provider, pageToken);

    $scope.providers = ['google', 'dailymotion', 'vimeo']
    $scope.providers.forEach (provider) ->
      $scope.searchVideoForm.provider[provider] =
        currentPage: 1
        isLoading: false

    searchVideo = (provider, next) ->
      $scope.searchVideoForm.provider[provider].isLoading = true
      videosService.searchVideo(
        provider
        $scope.searchVideoForm.videoName
        $scope.searchVideoForm.limit
        $scope.searchVideoForm.order.value
        next
      ).then (data) ->
        $scope.searchVideoForm.provider[provider].isLoading = false
        $scope.searchVideoForm.results[provider] = data
        if provider isnt 'google'
          if $scope.searchVideoForm.results[provider].totalResults / $scope.searchVideoForm.limit > 100
            $scope.searchVideoForm.results[provider].totalPages = 100 * $scope.searchVideoForm.limit
          else
            $scope.searchVideoForm.results[provider].totalPages = $scope.searchVideoForm.results[provider].totalResults
        alertsService.success data.totalResults + " vidéos trouvées pour le fournisseur " + provider
      , (err) ->
        $scope.searchVideoForm.provider[provider].isLoading = false
        alertsService.error "Impossible de récupérer des vidéo pour le fournisseur "+provider+". "+err

    $scope.searchVideoForm.order = $scope.searchVideoForm.orders[0]
    #$scope.itemsByPage = 5;

    $scope.searchVideo = ->
      if $scope.searchVideoForm.videoName and $scope.searchVideoForm.videoName.length > 1
        #search for all video providers at the same time
        $scope.providers.forEach (provider) -> searchVideo provider
      else
        alertsService.warn 'Veuillez taper un titre à rechercher'

    $scope.setSelected = (element) ->
      console.log("setSelected element ", element)
      $scope.searchVideoForm.selected = element

    $scope.addToPlaylist = (provider, $index) ->
      selected =
        video: $scope.searchVideoForm.results[provider].videos[$index]
        provider: provider

      if isAlreadySelected selected.video.id, provider
        alertsService.warn "La vidéo sélectionnée est déjà dans la playlist"
        return

      $scope.searchVideoForm.playlist.push selected
      unless $scope.searchVideoForm.selected?
        $scope.searchVideoForm.selected = $scope.searchVideoForm.playlist[$scope.searchVideoForm.playlist.length - 1]
      console.log '$scope.searchVideoForm.selected: ',$scope.searchVideoForm.selected
      console.log "Selected Video: ", $scope.searchVideoForm.selected.video
      #playlist lengthInSeconds ?

    $scope.removeFromPlaylist = (element) ->
      index = getPlaylistIndex element
      console.log "removeFromPlaylist: ", element
      $scope.searchVideoForm.playlist.splice index, 1
      if element.provider is $scope.searchVideoForm.selected.provider and element.video.id is $scope.searchVideoForm.selected.video.id
        console.log "removing current played element"
        #TODO stop properly the video ?
        delete $scope.searchVideoForm.selected
        return

    $scope.sanitize = (varWithHtml) ->
      $sce.trustAsHtml "<h5>#{varWithHtml}</h5>"

    $scope.openChannel = (channelURL) ->
      return if channelURL?.length is 0
      console.log "open Channel URL"
      $window.open channelURL, '_blank'

    isAlreadySelected = (videoId, provider) ->
      isSelected = false
      $scope.searchVideoForm.playlist.forEach (element) ->
        console.log "element: ", element
        isSelected = true if element.provider is provider and element.video.id is videoId
      isSelected

    getPlaylistIndex = (element) ->
      for i in [0..$scope.searchVideoForm.playlist.length - 1]
        row = $scope.searchVideoForm.playlist[i]
        return i if element.provider is row.provider and element.video.id is row.video.id
      -1

    $scope.getPlaylistIndex = getPlaylistIndex

    $scope.isEmpty = (object) ->
      Object.keys(object).length is 0

    #videoStarted
    $scope.$on 'videoStarted', ->
      $scope.$apply ->
        $scope.searchVideoForm.isReading = true
        $scope.searchVideoForm.isPaused = false
      console.log 'videoStarted'
    #TODO videoOnPause
     $scope.$on 'videoPaused', ->
      $scope.$apply ->
        $scope.searchVideoForm.isReading = false
        $scope.searchVideoForm.isPaused = true
      console.log 'videoPaused'

    #videoFinished
    $scope.$on 'videoFinished', ->
      #lit la video suivante !
      selectedIndex = getPlaylistIndex $scope.searchVideoForm.selected
      if $scope.searchVideoForm.playlist.length - 1 > selectedIndex
        console.log "next video"
        $scope.$apply ->
          $scope.searchVideoForm.selected = $scope.searchVideoForm.playlist[selectedIndex + 1]
      else if $scope.searchVideoForm.loop
        console.log "reset video"
        $scope.$apply ->
          $scope.searchVideoForm.selected = $scope.searchVideoForm.playlist[0]
      else
        $scope.searchVideoForm.isReading = false
      #otherwise stop

    $scope.changeCurrentPlaying = (order) ->
      selectedIndex = getPlaylistIndex $scope.searchVideoForm.selected
      if order is 'backward'
        if selectedIndex isnt 0
          $scope.searchVideoForm.selected = $scope.searchVideoForm.playlist[selectedIndex - 1]
      else
        if $scope.searchVideoForm.playlist.length - 1 > selectedIndex
          $scope.searchVideoForm.selected = $scope.searchVideoForm.playlist[selectedIndex + 1]

    $scope.changePlayingState = ->
      $scope.searchVideoForm.isPaused = not $scope.searchVideoForm.isPaused
      $scope.searchVideoForm.isReading = not $scope.searchVideoForm.isReading

    return

  appModule.controller 'SearchVideoController', ['$scope', '$window', '$location', '$sce', 'videosService', 'alertsService', SearchVideoController]
