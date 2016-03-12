require.config
  paths :
    'domReady' : '../bower_components/requirejs-domready/domReady'
    'angular' : '../bower_components/angular/angular.min'
    'angular-resource' : '../bower_components/angular-resource/angular-resource.min'
    'angular-route' : '../bower_components/angular-route/angular-route.min'
    'angular-bootstrap' : '../bower_components/angular-bootstrap/ui-bootstrap'
    'angular-bootstrap-tpls' : '../bower_components/angular-bootstrap/ui-bootstrap-tpls'
    'angular-file-upload' : '../bower_components/angular-file-upload/dist/angular-file-upload.min'
    'angular-tree-control' : '../bower_components/angular-tree-control/angular-tree-control'
    'ng-tags-input' : '../bower_components/ng-tags-input/ng-tags-input'
    'sha1' : '../bower_components/SHA-1/sha1'
    'angular-smart-table' : '../bower_components/angular-smart-table/dist/smart-table'
    'angular-i18n-fr' : '../bower_components/angular-i18n/angular-locale_fr-fr'
    'checklist-model' : '../bower_components/checklist-model/checklist-model'
    'moment' : '../bower_components/moment/moment'
    'ng-videosharing-embed' : '../bower_components/ng-videosharing-embed/build/ng-videosharing-embed.min'
    'angular-chart' : '../bower_components/angular-chart.js/dist/angular-chart.min'
    'chart' :  '../bower_components/Chart.js/Chart.min'
    'angular-drag-and-drop-lists' : '../bower_components/angular-drag-and-drop-lists/angular-drag-and-drop-lists.min'
    'angular-bootstrap-calendar' : '../bower_components/angular-bootstrap-calendar/dist/js/angular-bootstrap-calendar-tpls.min'
    'interact' : '../bower_components/interact/dist/interact.min'
    'player' : '../bower_components/angular-social-video-player/dist/player.min'
  shim :
    'angular' :
      'exports' : 'angular'
    'angular-route' : [ 'angular' ]
    'angular-resource' :
      deps : ['angular']
    'angular-bootstrap' :
      deps : ['angular']
    'angular-bootstrap-tpls' :
      deps : ['angular']
    'angular-file-upload' :
      deps : ['angular']
    'angular-tree-control' :
      deps : ['angular']
    'ng-tags-input' :
      deps : ['angular']
    'angular-smart-table' :
      deps : ['angular']
    'checklist-model' :
      deps : ['angular']
    'ng-videosharing-embed' :
      deps : ['angular']
    'angular-chart' :
      deps : ['angular', 'chart']
    'angular-drag-and-drop-lists' :
      deps : ['angular']
    'angular-bootstrap-calendar' :
      deps : ['angular', 'moment','angular-bootstrap']
    'player' :
      deps : ['angular']

  #kick start application
  deps: ['./bootstrap']
