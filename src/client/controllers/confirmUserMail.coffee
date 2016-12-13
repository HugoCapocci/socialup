define ['./module'], (appModule) ->

  class ConfirmUserMailController
    constructor: (@$scope, @$stateParams, @$uibModalInstance, @authService, @alertsService) ->
      @$scope.modalTitle = 'Confirmez votre email'
      console.log 'search user having id = ', @$stateParams.id
      @$scope.loading = true
      @authService.getUser @$stateParams.id
      .then (userFound) =>
        console.log 'active user: ', userFound
        @$scope.form =
          login: userFound.login
          password: ''
          id: userFound.id
          firstName: userFound.firstName
          lastName: userFound.lastName

    resetPassword: ->
      console.log 'resetPassword'
      if @$scope.form.password isnt '' and @$scope.form.repeatedPassword isnt ''
        if @$scope.form.password isnt @$scope.form.repeatedPassword
          @alertsService.warn 'Le mot de passe ne correspond pas'
        else
          #OK !
          @authService.changePassword @$scope.form.id, sha1 @$scope.form.password
          .then =>
            console.log 'ok'
            @$uibModalInstance.dismiss 'passwordReseted'
      else
        @alertsService.warn 'Veuillez renseigner tous les champs svp'

    closeAlert: ($index) ->
	    @alertsService.closeAlert $index

  ConfirmUserMailController.$inject = ['$scope', '$stateParams', '$uibModalInstance', 'authService', 'alertsService']
  appModule.controller 'ConfirmUserMailController', ConfirmUserMailController
