define ['./module', 'sha1'], (appModule, sha1) ->

  class LoginController
    constructor: (@$scope, @$uibModalInstance, @authService, @alertsService, @userService) ->
      console.log 'login controller constructor'
      @$scope.modalTitle = 'Enregistrez-vous / Créez votre compte'
      @$scope.form =
        login: ''
        password: ''
        firstName: ''
        lastName: ''

    authenticate: ->
      console.log 'authenticate: ', @$scope.form
      if @$scope.form.login isnt '' and @$scope.form.password isnt ''
        @authService.authenticate @$scope.form.login, sha1(@$scope.form.password)
        .then (userData) =>
          console.log 'userData: ',userData
          @userService.setData userData
          @alertsService.success 'Authentification ok'
          @$uibModalInstance.dismiss 'authentified'
        .catch (error) =>
          @alertsService.error 'Erreur dans le service d\'authentification: ' + error
      else
        @$scope.form =
          login: ''
          password: ''
        @alertsService.warn 'Veuillez renseigner tous les champs'

    createUser: ->
      if @$scope.form.login isnt '' and @$scope.form.password isnt '' and @$scope.form.firstName isnt '' and @$scope.form.lastName isnt '' and @$scope.form.repeatedPassword isnt ''
        if @$scope.form.password isnt @$scope.form.repeatedPassword
          @alertsService.warn 'Le mot de passe ne correspond pas'
        else
          console.log 'create OK'
          @authService.createUser @$scope.form.firstName, @$scope.form.lastName, @$scope.form.login, sha1 @$scope.form.password
          .then (userData) =>
            @$scope.user = userData
            @alertsService.success 'Utilisateur enregistré'
            console.log 'user created: ', userData
            @userService.setData userData
            @$uibModalInstance.dismiss 'createdAndAuthentified'
          .catch (error) =>
            @alertsService.error 'Erreur dans le service d\'authentification: ' + error
      else
        @alertsService.warn 'Veuillez renseigner tous les champs'

    sendResetPassword: ->
      console.log 'sendResetPassword'
      if @$scope.form.loginPasswordRetrieve isnt ''
        @authService.resetPassword @$scope.form.loginPasswordRetrieve
        .then (userData) ->
          @alertsService.success 'Un email vous a été envoyé pour réinitialiser votre mot de passe'
        .catch (error) ->
          @alertsService.error 'Erreur dans le service de réinitialisation du mot de passe: ' + error
      else
        @alertsService.warn 'Veuillez renseigner votre email'

    closeAlert: ($index) ->
	    @alertsService.closeAlert $index

  LoginController.$inject = ['$scope', '$uibModalInstance', 'authService', 'alertsService', 'userService']
  appModule.controller 'LoginController', LoginController
