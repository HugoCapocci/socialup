define ['./module'], (appModule) ->

  messageService = ($http, $q, $window) ->
    localData =  JSON.parse $window.localStorage.getItem 'SocialUp'

    @postMessage = (providers, message, providersOptions, scheduledDate) ->
      console.log "messageService.postMessage " + message
      console.log "providersOptions: ", providersOptions
      sendMessage message: message, providers: providers, providersOptions: providersOptions, scheduledDate: scheduledDate

    @postChainedMessage = (eventParentId, providers, chainedMessage, providersOptions) ->
      console.log "messageService.postChainedMessage for eventParentId: ", eventParentId
      return sendMessage message: chainedMessage, providers: providers, eventParentId: eventParentId, providersOptions: providersOptions

    sendMessage = (messageObject) ->
      $http.post('/message/'+localData.user.id,  messageObject)
      .then (response) ->
        console.log 'response for ', response
        response.data
      .catch (err) ->
        $q.reject err

    @searchTweets = (query) ->
      $http.get '/searchTweets?q=' + encodeURIComponent query
      .then (response) ->
        response.data
      .catch (err) ->
        $q.reject err

    return

  appModule.service 'messageService', ['$http', '$q', '$window', messageService]
