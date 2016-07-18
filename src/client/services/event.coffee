define ['./module'], (appModule) ->

  eventService = ($http, $q, $window) ->
    console.log 'eventservice loaded'
    localData = JSON.parse $window.localStorage.getItem 'SocialUp'

    getData = (path) ->
      $http.get path
      .then (response) ->
        response.data
      .catch (err) ->
        $q.reject err

    deleteEvent = (ressource) ->
      $http.delete(ressource)
      .then (response) ->
        console.log 'response for eventService.deleteEvent: ', response
        response
      .catch (err) ->
        console.log 'err in eventService.deleteEvent: ', err
        $q.reject err

    retrieveAllEvents = (eventCategory, id) ->
      getData '/'+eventCategory+'/'+id

    @retrieveAll = -> retrieveAllEvents 'events', localData.user.id

    @retrieveTracedEvents = -> retrieveAllEvents 'tracedEvents', localData.user.id

    @retrieveChainedEvents = (eventParentId) ->
      retrieveAllEvents 'chainedEvents', eventParentId

    @retrieveOne = (eventId) ->
      getData '/event/'+eventId

    @deleteScheduledEvent = (eventId) ->
      deleteEvent '/event/'+eventId

    @deleteChainedEvent = (eventId, eventParentId) ->
      deleteEvent '/event/chained/'+eventId+'/'+eventParentId

    @deleteTracedEvent = (eventId) ->
      deleteEvent '/event/traced/'+eventId

    @parseParams = (params, eventType) ->
      parsedParams = []
      switch(eventType)
        when 'message'
          parsedParams.push
            name: 'message'
            value: params[0]
        when 'uploadVideo'
          parsedParams.push
            name: 'titre'
            value: params[1]
          parsedParams.push
            name: 'description'
            value: params[2]
          if(params[3])
            parsedParams.push
              name: 'tags'
              value: params[3].toString()
        when 'uploadCloud'
          parsedParams.push
            name: 'targertFolder'
            value: params[0].toString()
      parsedParams

    @updateScheduledEvent = (eventId, scheduledEvent) ->
      $http.post '/event/'+eventId, scheduledEvent
      .then (response) ->
        console.log 'response for ', response
        response.data
      .catch (err) ->
        console.log 'err: ', err
        $q.reject err

    @getCategories = (provider) ->
      return $q.resolve [] unless localData?.user?.id?
      getData '/categories/' + provider + '/' + localData.user.id

    @getFacebookGroups = ->
      return $q.resolve [] unless localData?.user?.id?
      getData '/facebookGroups/' + localData.user.id

    @getFacebookPages = ->
      return $q.resolve [] unless localData?.user?.id?
      getData '/facebookPages/' + localData.user.id

    @getSocialEvents = (provider, sinceDate, untilDate, calendarId) ->
      return $q.resolve [] unless localData?.user?.id?
      url = '/socialEvents/' + provider + '/' + localData.user.id + '?since=' + sinceDate + '&until=' + untilDate
      if calendarId
        url += '&calendarId=' + encodeURIComponent calendarId
      getData url

    @getCalendars = (provider) ->
      return $q.resolve [] unless localData?.user?.id?
      console.log 'get calendars for user ', localData.user
      getData '/calendars/' + provider + '/' + localData.user.id

    return

  appModule.service 'eventService', ['$http', '$q', '$window', eventService]
