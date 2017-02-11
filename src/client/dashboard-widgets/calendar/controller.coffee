define ['../module', 'moment'], (appModule, moment) ->

  CalendarEventsController = ($scope,  $location, $uibModal, eventService, alertsService) ->
    console.log 'CalendarEventsController loaded'

    $scope.animationsEnabled = true
    $scope.isCellOpen = true
    $scope.calendarView = 'month'
    $scope.viewDate = new Date()
    $scope.calendarTitle = 'TEST'
    $scope.calendars = []

    $scope.displayEvent = (event) ->
      console.log 'open event ', event
      $uibModal.open
        animation: $scope.animationsEnabled
        templateUrl: 'modalEvent.html'
        controller: 'EventModalController'
        size: 'lg'
        resolve: event: -> event

    $scope.loadDefaultCalendars = ->
      #load google calendar:
      eventService.getCalendars 'google'
      .then (calendars) ->
        console.log 'calendars ', calendars
        $scope.calendars = calendars
        #TODO let user choose calendar(s)
        $scope.loadEvents()

    #load events, for a whole month
    $scope.loadEvents = ->
      limits = getLimits()
      $scope.events = []
      getSocialEvents 'facebook', limits
      $scope.calendars.forEach (calendar) ->
        #console.log("events for calendar: ", calendar.id)
        if calendar.selected
          getSocialEvents 'google', limits, calendar.id

    getLimits = ->
      limits =
        since: null
        until: null
      switch $scope.calendarView
        when 'month'
          limits.since = moment($scope.viewDate).set('date', 1).set('hour', 0).set('minute',0).set('second', 0)
          limits.until = moment($scope.viewDate).add(1, 'months').set('date', 1).set('hour', 0).set('minute',0).set('second', 0)
        when 'year'
          console.log('view YEAR: viewDate', $scope.viewDate)
          limits.since = moment($scope.viewDate).set('month', 0).set('date', 1).set('hour', 0).set('minute',0).set('second', 0)
          limits.until = moment($scope.viewDate).set('month', 11).set('date', 31).set('hour', 23).set('minute',59).set('second', 59)
        when 'week'
          console.log('view WEEK: viewDate', $scope.viewDate)
          limits.since = moment($scope.viewDate).weekday(0).set('hour', 0).set('minute',0).set('second', 0)
          limits.until = moment($scope.viewDate).weekday(6).set('hour', 23).set('minute',59).set('second', 59)
        when 'day'
          console.log('view DAY: viewDate', $scope.viewDate)
          limits.since = moment($scope.viewDate).set('hour', 0).set('minute',0).set('second', 0)
          limits.until = moment($scope.viewDate).set('hour', 23).set('minute',59).set('second', 59)
      console.log 'limits: ', limits
      limits

    getSocialEvents = (provider, limits, calendarId) ->
      #console.log("view date? ", $scope.viewDate)
      since =  moment($scope.viewDate).set('date', 1).set('hour', 0).set('minute',0).set('second', 0)
      timeSince = since.unix()
      untilDate = since.add(1, 'months').add(1, 'days')

      eventService.getSocialEvents provider, limits.since.valueOf(), limits.until.valueOf(), calendarId
      .then (events) ->
        console.log provider + ' events for current user: ', events
        events.forEach (event) ->
          eventSource =
            title: event.name
            description: event.description
            rsvp_status: event.rsvp_status
            draggable: false
            resizable: false
            editable: false
            deletable: false
            id: event.id
            provider: provider

          if event.start_time
            eventSource.startsAt = moment(event.start_time).toDate()
          else if event.start
            #ALL DAY EVENT
            eventSource.startsAt = new Date event.start
            eventSource.allDay = true
            eventSource.endsAt = moment(eventSource.startsAt).set('hour', 23).set('minute',59).set('second', 59).toDate()
          else
            console.error 'no start_time nor start attribute specified, event rejected: ', event
            return

          switch (event.rsvp_status)
            when 'attending', 'confirmed'
              eventSource.type = 'success'
            when 'declined'
              eventSource.type = 'inverse'
              eventSource.incrementsBadgeTotal = false
            when 'unsure', 'tentative'
              eventSource.type = 'warning'

          if event.end_time
            eventSource.endsAt = moment(event.end_time).toDate()
          addEvent eventSource
      .catch (err) ->
        alertsService.error 'Impossible de récupérer les évènements facebook. Err: ' + err

    addEvent = (event) ->
      exists = false
      for i in [0..$scope.events.length-1]
        if  $scope.events[i].id is event.id
          exists = true
          continue
      $scope.events.push event unless exists

    $scope.deleteEvent = (event) ->
      console.log 'delete event: ', event
      #TODO open modal window with loading gif, and close it after
      eventService.deleteFacebookEvent event.id
      .then ->
        index = $scope.events.indexOf event
        if index isnt -1
          $scope.events.splice index, 1
      .catch (err) ->
        alertsService.error 'Impossible d\'effacer l\'évènement. Err: '+ err

    $scope.modify = (event) ->
      #TODO
      #open modal popup with form data and save button
      if event.type is 'message'
        $location.url '/postMessage?eventId=' + event.id
      else if event.type is 'uploadVideo'
        $location.url '/uploadFile?eventId=' + event.id

  EventModalController = ($scope, $rootScope, $location, $uibModalInstance, event) ->
    console.log 'EventModalController loaded'
    $scope.modal =
      event: event
      ok: -> $uibModalInstance.close()
      cancel: -> $uibModalInstance.dismiss 'cancel'

  appModule
  .controller 'EventModalController', ['$scope', '$rootScope', '$location', '$uibModalInstance', 'event', EventModalController]
  .controller 'CalendarEventsController', ['$scope', '$location', '$uibModal', 'eventService', 'alertsService', CalendarEventsController]
