define ['./module', 'moment', 'angular-i18n-fr'], (appModule, moment) ->

  moment.locale 'fr',
    months: "janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre".split("_")
    monthsShort: "janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.".split("_")
    weekdays: "dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_")
    weekdaysShort: "dim._lun._mar._mer._jeu._ven._sam.".split("_")
    weekdaysMin: "Di_Lu_Ma_Me_Je_Ve_Sa".split("_")
    longDateFormat:
      LT : "HH:mm"
      LTS : "HH:mm:ss"
      L : "DD/MM/YYYY"
      LL : "D MMMM YYYY"
      LLL : "D MMMM YYYY LT"
      LLLL : "dddd D MMMM YYYY LT"
    calendar:
      sameDay: "[Aujourd'hui à] LT"
      nextDay: '[Demain à] LT'
      nextWeek: 'dddd [à] LT'
      lastDay: '[Hier à] LT'
      lastWeek: 'dddd [dernier à] LT'
      sameElse: 'L'
    relativeTime :
      future : "dans %s"
      past : "il y a %s"
      s : "quelques secondes"
      m : "une minute"
      mm : "%d minutes"
      h : "une heure"
      hh : "%d heures"
      d : "un jour"
      dd : "%d jours"
      M : "un mois"
      MM : "%d mois"
      y : "un an"
      yy : "%d ans"
    ordinalParse: /\d{1,2}(er|ème)/
    ordinal: (number) ->
      number + (if number is 1 then 'er' else 'ème')
    meridiemParse: /PD|MD/
    isPM: (input) ->
      input.charAt 0 is 'M'
    meridiem: (hours) ->
      hours < 12 ? 'PD' : 'MD'
    week:
      dow: 1
      doy: 4

  class MainController

    constructor: (@$mdMedia, @$scope, @$rootScope, @$location, @$window, @alertsService, @userService) ->
      console.log 'MainController constructor loaded'
      parameters = @$location.search()
      if parameters.close
        @alertsService.success 'OAuth authentication sucessfull'
        @$window.close()
      @localData = @userService.getUserData()
      console.log "localData found: ", @localData
      @$scope.openMenu = false
      @$scope.layout = if @$mdMedia 'gt-sm' then 'row' else 'column'
      @$scope.menu =
        direction: if @$mdMedia 'gt-sm' then 'down' else 'right'
        tooltipDirection: if @$mdMedia 'gt-sm' then 'right' else 'down'

      @$scope.$watch( => @$mdMedia 'gt-sm'
      (isGtSm) =>
        @$scope.layout = if isGtSm then 'row' else 'column'
        @$scope.menu =
          direction: if isGtSm then 'down' else 'right'
          tooltipDirection: if isGtSm then 'right' else 'down'
      )

    closeAlert: ($index) ->
      console.log "close alert index: ", $index
      @$rootScope.alerts.splice $index, 1

    signout: ->
      @userService.deleteData()

    model:
      rows: [
        columns: [{
          styleClass: 'col-md-3'
          widgets: [
            type: 'twitter'
            config: {}
            title: 'Derniers tweets'
          ]
        }, {
          styleClass: "col-md-9"
          widgets: [{
            type: 'videoPlayer'
            config: {}
            title: 'Chercher une vidéo'
          }]
        }]
      ]

  MainController.$inject = ['$mdMedia', '$scope', '$rootScope', '$location', '$window', 'alertsService', 'userService']
  appModule.controller 'MainController', MainController

  class WaitingModalController

    constructor: (@$scope, @$rootScope, @$location, @$uibModalInstance) ->
      @$scope.modal =
        title: 'Traitement en cours'
        ok: ->
          $uibModalInstance.close()
        cancel: ->
          $uibModalInstance.dismiss 'cancel'
        isLoading: true
        type: 'warning'
        progress: 0

      @$rootScope.stopProgress = (message) ->
        @$scope.modal.type = 'success'
        @$scope.modal.message = message
        @$scope.modal.progress = 100

      @$rootScope.doProgress = (progress) ->
        if progress <= 25
          @$scope.modal.type = 'danger'
        else if progress <= 60
          @$scope.modal.type = 'warning'
        else
          @$scope.modal.type = 'info'
        @$scope.modal.progress = progress

      return

  WaitingModalController.$inject = ['$scope', '$rootScope', '$location', '$uibModalInstance']
  appModule.controller 'WaitingModalController', WaitingModalController
