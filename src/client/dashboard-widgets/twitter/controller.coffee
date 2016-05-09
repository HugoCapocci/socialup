define ['../module'], (appModule) ->

  TwitterController = ($scope) ->
    $scope.tweets = [
      'one'
      'two'
      'three'
    ]
    return

  appModule.controller 'TwitterController', ['$scope', TwitterController]
