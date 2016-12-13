define ['angular', 'app'], (angular, app) ->

  return app.config ['calendarConfig', (calendarConfig) ->

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

  .config ['dashboardProvider', (dashboardProvider) ->
    dashboardProvider.structure '3-9', rows: [
      columns: [{styleClass: 'col-md-3'}, {styleClass: 'col-md-9'}]
    ]
  ]

  .config ['$compileProvider', ($compileProvider) ->
    $compileProvider.debugInfoEnabled false
  ]

  .config ['$stateProvider', ($stateProvider) ->
    $stateProvider
    .state 'home',
      url: '/'
    .state 'resetPassword',
      url: '/resetPassword?hash'
      onEnter: ['ModalProvider', (ModalProvider) ->
        ModalProvider.openModal 'resetPassword'
      ]
    .state 'login',
      url: '/login'
      onEnter: ['ModalProvider', (ModalProvider) ->
        ModalProvider.openModal 'login'
      ]
    .state 'confirm',
      url: '/confirm?id'
      onEnter: ['ModalProvider', (ModalProvider) ->
        ModalProvider.openModal 'confirmUserMail'
      ]

  ]
