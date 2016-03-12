define ['../bower_components/angular/angular', 'app'], (angular, app) ->

  generateRouteProviders = ($routeProvider, route) ->
    $routeProvider.when '/'+route,
      templateUrl: 'views/'+route+'.html',
      controller: route.substring(0,1).toUpperCase()+route.substring(1)+'Controller',
      reloadOnSearch : false

  return app.config ['$routeProvider', ($routeProvider) ->
    routes = [
      'uploadFile',
      'uploadMusic',
      'cloudExplorer',
      'postMessage',
      'login',
      'resetPassword',
      'scheduledEvents',
      'tracedEvents',
      'calendarEvents',
      'videos',
      'searchVideo',
      'pageStats',
      'manageSocialNetworks'
    ]
    for route in routes
      generateRouteProviders $routeProvider, route
  ]
  .config ['calendarConfig', (calendarConfig) ->

    # calendarConfig.templates.calendarMonthView = 'path/to/custom/template.html'; //change the month view template to a custom template
    # calendarConfig.templates.calendarMonthCell = 'customMonthCell.html';
    calendarConfig.dateFormatter = 'moment' #use either moment or angular to format dates on the calendar. Default angular. Setting this will override any date formats you have already set.
    # calendarConfig.allDateFormats.moment.date.hour = 'HH:mm'; //this will configure times on the day view to display in 24 hour format rather than the default of 12 hour
    calendarConfig.allDateFormats.moment.date =
      hour: 'HH:mm'
      day: 'D MMM'
      month: 'MMMM'
      weekDay: 'dddd'
      time: 'HH:mm'
      datetime: 'D MMM H:mm'
    calendarConfig.allDateFormats.moment.title.day =  'D dddd MMMM YYYY'
    calendarConfig.allDateFormats.moment.title.week = 'Semaine {week} de {year}'
    calendarConfig.templates.calendarDayView = 'templates/calendarDayView.html'
    calendarConfig.templates.calendarWeekView = 'templates/calendarWeekView.html'
    calendarConfig.templates.calendarSlideBox = 'templates/calendarSlideBox.html'
    calendarConfig.templates.calendarMonthCellEvents = 'templates/calendarMonthCellEvents.html'
    # calendarConfig.allDateFormats.moment.title.day = 'D ddd MMM'; #this will configure the day view title to be shorter
    calendarConfig.i18nStrings.eventsLabel = 'évènements' #/This will set the events label on the day view
    calendarConfig.displayAllMonthEvents = true #This will display all events on a month view even if they're not in the current month. Default false.
    calendarConfig.displayEventEndTimes = false #This will display event end times on the month and year views. Default false.
    calendarConfig.showTimesOnWeekView = true #Make the week view more like the day view, with the caveat that event end times are ignored.
  ]
