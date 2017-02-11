define ['../module'], (appModule) ->

  CloudExplorerController = ($scope, $window, $timeout, $uibModal, $q, cloudService, alertsService, userService, FileUploader) ->

    $scope.isLoading = false
    $scope.treeOptions =
      nodeChildren: 'children'
      dirSelectable: true
      isLeaf: (node) -> !node.isFolder
      injectClasses:
        ul: 'a1'
        li: 'a2'
        liSelected: 'a7'
        iExpanded: 'a3'
        iCollapsed: 'a4'
        iLeaf: 'a5'
        label: 'a6'
        labelSelected: 'a8'

    $scope.dataForTheTree = []
    $scope.cloudExplorer =
      providers: []
      provider: null
      selectedFile: null

    #user providers:
    activeProviders = Object.keys userService.getActiveProviders()
    console.log 'activeProviders: ', activeProviders
    if activeProviders.indexOf('google') isnt -1
      $scope.cloudExplorer.providers.push 'google'
    if activeProviders.indexOf('dropbox') isnt -1
      $scope.cloudExplorer.providers.push 'dropbox'

    $scope.publishFile = ->
      #//selon le type de fichier
      console.log 'publishFile: ', $scope.cloudExplorer.selectedFile
      name = $scope.cloudExplorer.selectedFile.name
      ext = name.substr(name.lastIndexOf('.') + 1)
      audioExts = ['mp3', 'wav', 'aif']
      console.log 'file ext: ', ext
      modalInstance = $uibModal.open
        animation: $scope.animationsEnabled
        templateUrl: 'modalContent.html'
        controller: if audioExts.indexOf(ext) isnt -1 then 'UploadMusicModalController' else 'UploadFileModalController'
        size: 'lg'
        resolve:
          file: -> $scope.cloudExplorer.selectedFile
          provider: ->$scope.cloudExplorer.provider

      modalInstance.result.then ->
        console.log 'Modal executed'
      .catch (error) ->
        console.log 'Modal dismissed at: ' + new Date()

    $scope.getDownloadFileURL = ->
      if $scope.cloudExplorer.selectedFile.downloadUrl
        $scope.cloudExplorer.selectedFile.downloadUrl
      else
        cloudService.getDownloadFileURL $scope.cloudExplorer.provider, encodeURIComponent($scope.cloudExplorer.selectedFile.id.substring(1))

    $scope.deleteFile = ->
      console.log 'delete file'
      fileId = $scope.cloudExplorer.selectedFile.id
      if $scope.cloudExplorer.provider is 'dropbox'
        fileId = fileId.substring 1
      cloudService.deleteFile($scope.cloudExplorer.provider, fileId).then ->
        console.log 'file deleted'
      .catch (error) ->
        console.log 'error: ', error

    loadProviderRootData = ->
      #load
      $scope.dataForTheTree = undefined
      $scope.cloudExplorer.selectedFile = undefined
      $scope.isLoading = true
      #adapt pie chart data to selected provider
      $scope.labels = ['Espace utilisé', 'Espace disponible']
      $scope.data = [spaceUsage[$scope.cloudExplorer.provider].used, spaceUsage[$scope.cloudExplorer.provider].total - spaceUsage[$scope.cloudExplorer.provider].used]
      cloudService.getFiles($scope.cloudExplorer.provider).then (files) ->
        $scope.dataForTheTree = files
        $scope.isLoading = false
        console.log 'cloud service OK files: ', files
      .catch (error) ->
        $scope.isLoading = false
        console.log 'error in cloud service: ', error

    $scope.cloudExplorer.changeProvider = loadProviderRootData

    $scope.showToggle = (node, expanded) ->
      if expanded
        $scope.isLoading = true
        cloudService.getFiles($scope.cloudExplorer.provider, node.id).then (files) ->
          $scope.isLoading = false
          node.children = files
          console.log 'cloud service OK'
        .catch (error) ->
          $scope.isLoading = false
          console.log 'error in cloud service: ', error
      else
        node.children = []

    $scope.showSelected = (node, selected) ->
      console.log 'node: ', node
      if selected
        $scope.cloudExplorer.selectedFile = node
      else
        $scope.cloudExplorer.selectedFile = undefined
      console.log('selectedFile: ' + node.name + ', type: ' + node.mimeType + ', id: ' + node.id)

    #pie chart
    $scope.chartOptions =
      #Boolean - Whether we should show a stroke on each segment
      segmentShowStroke: true
      #String - The colour of each segment stroke
      segmentStrokeColor: '#fff'
      #Number - The width of each segment stroke
      segmentStrokeWidth: 2
      #Number - The percentage of the chart that we cut out of the middle
      percentageInnerCutout: 0 # This is 0 for Pie charts
      #Number - Amount of animation steps
      animationSteps: 100
      #String - Animation easing effect
      animationEasing: 'easeOutBounce'
      #Boolean - Whether we animate the rotation of the Doughnut
      animateRotate: true
      #Boolean - Whether we animate scaling the Doughnut from the centre
      animateScale: true
      tooltipTemplate: "<%if (label){%><%=label%>: <%}%><%var units=['o', 'Ko', 'Mo', 'Go', 'To'] var unitIndex=0 var reducedValue=value while((reducedValue/1024)>1) {reducedValue=reducedValue/1024unitIndex++} %><%=reducedValue.toFixed(2)%> <%=units[unitIndex]%>"

    total = 0
    spaceUsage = {}
    $scope.data = []
    $scope.labels = []

    getSpaceUsage = (provider) ->
      deferred = $q.defer()
      cloudService.getSpaceUsage(provider).then (response) ->
        spaceUsage[provider] = response.data
        total += response.data.total
        $scope.data.push response.data.used
        $scope.labels.push 'Espace utilisé sur ' + provider
        deferred.resolve()
      .catch (error) ->
         deferred.reject error
      deferred.promise

    getGlobalSpaceUsage = (providers) ->
      results = []
      providers.forEach (provider) ->
        results.push getSpaceUsage provider
      $q.all results

    getGlobalSpaceUsage($scope.cloudExplorer.providers).then ->
      Object.keys(spaceUsage).forEach (provider) ->
        total = total - spaceUsage[provider].used
      $scope.data.push total
      $scope.labels.push 'Espace total disponible'

    $scope.cloudUploader = new FileUploader url: '/uploadFileToCloud/' + userService.getUserData().id

    $scope.cloudUploader.onAfterAddingFile = (fileItem) ->
      console.info 'onAfterAddingFile', fileItem
      #upload!
      fileItem.formData = [
        {provider: $scope.cloudExplorer.provider}
        {target: $scope.cloudExplorer.selectedFile.id}
      ]
      $scope.isLoading = true
      fileItem.upload()

    $scope.cloudUploader.onSuccessItem = (item, response, status, headers) ->
      $scope.isLoading = false
      console.log 'TODO: refresh folder'

    #Workaround
    $scope.uploadFile = ->
      console.log 'trigger click'
      $timeout ->
        element = angular.element document.querySelector('#fileDialog')
        console.log 'dom element: ', element
        element.triggerHandler 'click'
      , 0

  appModule.controller 'CloudExplorerController', ['$scope', '$window', '$timeout', '$uibModal', '$q', 'cloudService', 'alertsService', 'userService', 'FileUploader', CloudExplorerController]
