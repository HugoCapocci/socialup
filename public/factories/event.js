define(['./module'], function(appModule) {
  var eventFactory;
  eventFactory = function($resource) {
    return $resource('/event/:eventType/:eventId', {
      eventId: '@eventId',
      eventType: '@eventType'
    });
  };
  return appModule.factory('EventFactory', ['$resource', eventFactory]);
});
