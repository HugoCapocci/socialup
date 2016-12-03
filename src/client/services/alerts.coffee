define ['./module'], (appModule) ->

  alertsService = ($rootScope, $timeout) ->
    $rootScope.alerts = [] unless $rootScope.alerts?

    #authentication is made by provider callbacks
    @success = (message, delay) ->
      createAlert message, 'success', delay

    @error = (message, delay) ->
      createAlert message, 'danger', delay

    @info = (message, delay) ->
      createAlert message, 'info', delay

    @warn = (message, delay) ->
      createAlert message, 'warning', delay

    @closeAlert = (index) ->
      $rootScope.alerts.splice index, 1
      return

    createAlert = (message, type, delay) ->
      delay = 2000 unless delay?
      alert =
        msg: message
        type: type
        opacity: 1
      index = getIndex alert
      if index is -1
        $rootScope.alerts.push alert
      else
        $rootScope.alerts[index].opacity = 1

      $timeout ->
        deleteAlert alert
      , delay

    deleteAlert = (alert) ->
      index = getIndex alert
      if index is -1
        return
      if $rootScope.alerts?[index]?
        if $rootScope.alerts[index].opacity < 0.1
          $rootScope.alerts.splice index, 1
      else
        $rootScope.alerts[index].opacity = 0.9 * $rootScope.alerts[index].opacity
      $timeout ->
        deleteAlert alert
      , 100

    getIndex = (alert) ->
      return -1 unless $rootScope.alerts?.length > 0
      index = -1
      for myAlert, i in $rootScope.alerts
        if myAlert.msg is alert.msg and myAlert.type is alert.type
          index = i
          continue
      index

    return

  appModule.service 'alertsService', ['$rootScope', '$timeout', alertsService]
