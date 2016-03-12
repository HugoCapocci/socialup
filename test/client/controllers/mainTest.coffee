define ['angular', 'angularMocks'], (angular, mocks) ->

  describe 'MainControllerTest', ->

    beforeEach ->
      module 'SocialUp.controllers'

    beforeEach ->
      #console.log 'typeof inject: ', typeof inject
      try
        inject ($controller, $rootScope, $injector) ->
          @$rootScope = $rootScope
          @$scope = @$rootScope.$new()
          @$location = $injector.get '$location'
          @$window = $injector.get '$window'
          console.log 'YOLOOOOOO'
          $controller 'MainController',
            '$scope': @$scope
            '$rootScope': @$rootScope
            '$location': @$location
            '$windows': @$window
      catch err
        console.log 'err: ', err

    it 'dummy', ->
      console.log "OK SO FAR"
