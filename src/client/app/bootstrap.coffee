###
# bootstraps angular onto the window.document node
###
define [
  'require',
  'angular',
  'app',
  'routes'
], (require, angular, app) ->

  require ['domReady!'], (document) ->
    console.log "domReady"
    angular.bootstrap document, ['SocialUp'], strictDi: true
