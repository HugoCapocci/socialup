define ['./module'], (appModule) ->

  ModalProvider = ($uibModal, $state) ->

    getControllerName = (state) ->
     state.substring(0, 1).toUpperCase() + state.substring(1) + 'Controller'

    @openModal = (state) ->
      modalInstance = $uibModal.open
        animation: false
        templateUrl: "views/#{state}.html"
        controller: getControllerName state
        controllerAs: 'controller'
        size: 'lg'

      modalInstance.result.finally ->
        $state.go 'home'

    return

  appModule.service 'ModalProvider', ['$uibModal', '$state', ModalProvider]
