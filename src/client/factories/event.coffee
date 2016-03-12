define ['./module'], (appModule) ->

  eventFactory = ($resource) ->
    $resource '/event/:eventType/:eventId', {eventId: '@eventId', eventType: '@eventType'}

  appModule.factory 'EventFactory', ['$resource', eventFactory]