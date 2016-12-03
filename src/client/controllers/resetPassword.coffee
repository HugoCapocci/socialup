define ['./module', 'sha1'], (appModule, sha1) ->

  class ResetPasswordController
    constructor: (@$scope, @$stateParams, @$uibModalInstance, @authService, @alertsService) ->
      @$scope.modalTitle = 'Réinitialisez votre mot de passe'
      console.log 'search user having hash = ', @$stateParams.hash
      @authService.getUser @$stateParams.hash
      .then (userFound) =>
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

  ResetPasswordController.$inject = ['$scope', '$stateParams', '$uibModalInstance', 'authService', 'alertsService']
  appModule.controller 'ResetPasswordController', ResetPasswordController
