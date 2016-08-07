define ['../module'], (appModule) ->

  TwitterController = ($scope, $filter, messageService) ->
    $scope.searchTweets = ->
      messageService.searchTweets $scope.query
      .then (tweets) ->
        console.log 'get tweets! ', tweets
        $scope.statuses = tweets.statuses
      .catch (error) ->
        console.log 'get tweets error :/ ', error
      return

    $scope.formatStringDate = (string) ->
      $filter('date') new Date(string), 'MM/dd/yyyy hh:mm'

  appModule.controller 'TwitterController', ['$scope', '$filter', 'messageService', TwitterController]
