define(['angular', 'app'], function(angular, app) {
  var generateRouteProviders;
  generateRouteProviders = function($routeProvider, route) {
    return $routeProvider.when('/' + route, {
      templateUrl: 'views/' + route + '.html',
      controller: route.substring(0, 1).toUpperCase() + route.substring(1) + 'Controller',
      reloadOnSearch: false
    });
  };
  return app.config([
    '$routeProvider', function($routeProvider) {
      var i, len, results, route, routes;
      routes = ['uploadFile', 'uploadMusic', 'cloudExplorer', 'postMessage', 'login', 'resetPassword', 'scheduledEvents', 'tracedEvents', 'calendarEvents', 'videos', 'searchVideo', 'pageStats', 'manageSocialNetworks'];
      results = [];
      for (i = 0, len = routes.length; i < len; i++) {
        route = routes[i];
        results.push(generateRouteProviders($routeProvider, route));
      }
      return results;
    }
  ]).config([
    'calendarConfig', function(calendarConfig) {
      calendarConfig.dateFormatter = 'moment';
      calendarConfig.allDateFormats.moment.date = {
        hour: 'HH:mm',
        day: 'D MMM',
        month: 'MMMM',
        weekDay: 'dddd',
        time: 'HH:mm',
        datetime: 'D MMM H:mm'
      };
      calendarConfig.allDateFormats.moment.title.day = 'D dddd MMMM YYYY';
      calendarConfig.allDateFormats.moment.title.week = 'Semaine {week} de {year}';
      calendarConfig.templates.calendarDayView = 'templates/calendarDayView.html';
      calendarConfig.templates.calendarWeekView = 'templates/calendarWeekView.html';
      calendarConfig.templates.calendarSlideBox = 'templates/calendarSlideBox.html';
      calendarConfig.templates.calendarMonthCellEvents = 'templates/calendarMonthCellEvents.html';
      calendarConfig.i18nStrings.eventsLabel = 'évènements';
      calendarConfig.displayAllMonthEvents = true;
      calendarConfig.displayEventEndTimes = false;
      return calendarConfig.showTimesOnWeekView = true;
    }
  ]).config([
    'dashboardProvider', function(dashboardProvider) {
      return dashboardProvider.structure('3-9', {
        rows: [
          {
            columns: [
              {
                styleClass: 'col-md-3'
              }, {
                styleClass: 'col-md-9'
              }
            ]
          }
        ]
      });
    }
  ]);
});
