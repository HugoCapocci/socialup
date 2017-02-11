define ['./module'], (appModule) ->

  cloudService = ($http, $q, $window) ->
    localData = JSON.parse $window.localStorage.getItem('SocialUp')

    #authentication is made by provider callbacks
    @getFolders = (provider, parentFolder) ->
      retrieveFiles provider, parentFolder, 'folder'

    @getFiles = (provider, parentFolder) ->
      retrieveFiles provider, parentFolder

    retrieveFiles = (provider, parentFolder, typeFilter) ->
      deferred = $q.defer()
      if parentFolder is undefined
        parentFolder = 'root'

      if provider is 'dropbox'
        parentFolder = encodeURIComponent parentFolder
        # console.log("encoded path ", parentFolder);
      path = '/cloudExplorer/' + provider + '/' + parentFolder + '/' + localData.user.id
      if typeFilter isnt undefined
        path += '/?typeFilter=' + typeFilter

      $http.get(path).then (response) ->
        #console.log('response for folderId '+parentFolder+': ', response);
        deferred.resolve response.data
      .catch (err) ->
        console.log 'err: ', err
        deferred.reject err
      deferred.promise

    @getFile = (provider, fileId) ->
      deferred = $q.defer()
      $http.get '/file/' + provider + '/' + fileId + '/' + localData.user.id
      .then (response) ->
        console.log 'response getFile ', response
        deferred.resolve response.data
      .catch (err) ->
        console.log 'err: ', err
        deferred.reject err
      deferred.promise

    @getDownloadFileURL = (provider, fileId) ->
      '/file/' + provider + '/' + fileId + '/' + localData.user.id

    @uploadChained = (provider, eventId, folderId) ->
      deferred = $q.defer()
      $http.post '/event/chained/' + provider + '/' + eventId + '/' + localData.user.id, eventParams: [folderId], eventType: 'uploadCloud'
      .then (response) ->
        console.log "response for folderId #{folderId}: ", response
        deferred.resolve response.data
      .catch (err) ->
        console.log 'err: ', err
        deferred.reject err
      deferred.promise

    @getSpaceUsage = (provider) ->
      $http.get '/spaceUsage/' + provider + '/' + localData.user.id

    @deleteFile = (provider, fileId) ->
      $http.delete '/file/' + provider + '/' + encodeURIComponent(fileId) + '/' + localData.user.id

    return

  appModule.service 'cloudService', ['$http', '$q', '$window', cloudService]
