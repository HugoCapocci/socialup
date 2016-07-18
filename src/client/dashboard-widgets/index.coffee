define [
  './module'
  './calendar/controller'
  './video-player/controller'
  './twitter/controller'
], (appModule) ->

  appModule.config ['dashboardProvider', (dashboardProvider) ->
    widgetsPath = 'dashboard-widgets'
    dashboardProvider
    .widget 'videoPlayer',
      title: 'Video player'
      description: 'Displays a search panel for yoube, dailymotion and vimeo videos'
      templateUrl: "#{widgetsPath}/video-player/view.html"
      controller: 'SearchVideoController'
      edit:
        templateUrl: "#{widgetsPath}/video-player/edit.html"
        controller: 'SearchVideoController'

    .widget 'twitter',
      title: 'Twitter reader'
      description: 'Displays latests tweets'
      templateUrl: "#{widgetsPath}/twitter/view.html"
      controller: 'TwitterController'
      edit:
        templateUrl: "#{widgetsPath}/twitter/view.html"
        controller: 'TwitterController'

    .widget 'calendar',
      title: 'Calendar'
      description: 'Displays and manage events'
      templateUrl: "#{widgetsPath}/calendar/view.html"
      controller: 'CalendarEventsController'
      edit:
        templateUrl: "#{widgetsPath}/calendar/view.html"
        controller: 'CalendarEventsController'
    return
  ]
