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
      deferred = $q.defer();
      $http.post('/message/'+localData.user.id,  messageObject)
      .then (response) ->
          console.log 'response for ', response
          deferred.resolve response.data
      , (err) ->
        deferred.reject err
      deferred.promise
    return

  appModule.service 'messageService', ['$http', '$q', '$window', messageService]
