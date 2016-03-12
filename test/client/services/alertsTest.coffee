define ['angular', 'angularMocks'], (angular, mocks) ->

  describe 'AlertsService', ->

    beforeEach ->
      module 'SocialUp.services'

    beforeEach ->
      try
        inject ($injector) ->
          @alertsService = $injector.get 'alertsService'
      catch err
        console.log 'err: ', err

    it 'dummy', ->
      console.log "OK ", @alertsService
