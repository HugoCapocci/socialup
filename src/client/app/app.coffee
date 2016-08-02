define [
  'angular'
  'angular-resource'
  'angular-route'
  'angular-sanitize'
  'angular-bootstrap'
  'angular-bootstrap-tpls'
  'angular-file-upload'
  'angular-tree-control'
  'ng-tags-input'
  'angular-smart-table'
  'checklist-model'
  'ng-videosharing-embed'
  'angular-chart'
  'angular-drag-and-drop-lists'
  'angular-bootstrap-calendar'
  '../services/index'
  '../controllers/index'
  '../factories/index'
  'player'
  './filters'
  'angular-dashboard-framework'
  '../dashboard-widgets/index'
], (angular) ->
  console.log 'SOCIAL APP LOADING'

  angular.module 'SocialUp', [
    'ngResource'
    'ngRoute'
    'ngSanitize'
    'ui.bootstrap'
    'ui.bootstrap.tpls'
    'angularFileUpload'
    'treeControl'
    'ngTagsInput'
    'smart-table'
    'checklist-model'
    'videosharing-embed'
    'chart.js'
    'dndLists'
    'mwl.calendar'
    'SocialUp.services'
    'SocialUp.controllers'
    'SocialUp.factories'
    'socialVideoPlayer'
    'SocialUp.filters'
    'adf'
    'adf.widget.videoPlayer'
  ]
