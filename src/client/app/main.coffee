require.config
  paths:
    'domReady': '../bower_components/requirejs-domready/domReady'
    'angular': '../bower_components/angular/angular'
    'angular-resource': '../bower_components/angular-resource/angular-resource'
    'angular-ui-router': '../bower_components/angular-ui-router/release/angular-ui-router'
    'angular-bootstrap': '../bower_components/angular-bootstrap/ui-bootstrap'
    'angular-bootstrap-tpls': '../bower_components/angular-bootstrap/ui-bootstrap-tpls'
    'angular-dashboard-framework': '../bower_components/angular-dashboard-framework/dist/angular-dashboard-framework'
    'angular-file-upload': '../bower_components/angular-file-upload/dist/angular-file-upload'
    'angular-tree-control': '../bower_components/angular-tree-control/angular-tree-control'
    'angular-sanitize': '../bower_components/angular-sanitize/angular-sanitize'
    'ngAnimate': '../bower_components/angular-animate/angular-animate'
    'ngAria': '../bower_components/angular-aria/angular-aria'
    'ngMaterial': '../bower_components/angular-material/angular-material'
    'ng-tags-input': '../bower_components/ng-tags-input/ng-tags-input'
    'sha1': '../bower_components/SHA-1/sha1'
    'angular-smart-table': '../bower_components/angular-smart-table/dist/smart-table'
    'angular-i18n-fr': '../bower_components/angular-i18n/angular-locale_fr-fr'
    'checklist-model': '../bower_components/checklist-model/checklist-model'
    'moment': '../bower_components/moment/moment'
    'ng-videosharing-embed': '../bower_components/ng-videosharing-embed/build/ng-videosharing-embed.min'
    'angular-chart': '../bower_components/angular-chart.js/dist/angular-chart'
    'chart':  '../bower_components/chart.js/dist/Chart'
    'angular-drag-and-drop-lists': '../bower_components/angular-drag-and-drop-lists/angular-drag-and-drop-lists'
    'angular-bootstrap-calendar': '../bower_components/angular-bootstrap-calendar/dist/js/angular-bootstrap-calendar-tpls'
    'interact': '../bower_components/interact/dist/interact'
    'player': '../bower_components/angular-social-video-player/dist/player.min'
    'Sortable':  '../bower_components/Sortable/Sortable'
  shim:
    'angular':
      'exports': 'angular'
    'angular-ui-router': ['angular']
    'angular-resource':
      deps: ['angular']
    'angular-bootstrap':
      deps: ['angular']
    'angular-bootstrap-tpls':
      deps: ['angular']
    'angular-dashboard-framework':
      deps: ['angular', 'Sortable', 'angular-bootstrap', 'angular-bootstrap-tpls']
    'angular-file-upload':
      deps: ['angular']
    'angular-tree-control':
      deps: ['angular']
    'ng-tags-input':
      deps: ['angular']
    'angular-smart-table':
      deps: ['angular']
    'checklist-model':
      deps: ['angular']
    'ng-videosharing-embed':
      deps: ['angular']
    'angular-chart':
      deps: ['angular', 'chart']
    'angular-drag-and-drop-lists':
      deps: ['angular']
    'angular-bootstrap-calendar':
      deps: ['angular', 'moment', 'angular-bootstrap']
    'player':
      deps: ['angular']
    'angular-sanitize':
      deps: ['angular']
    'ngAnimate': ['angular']
    'ngAria': ['angular']
    'ngMaterial':
       deps: ['ngAnimate', 'ngAria']

  #kick start application
  deps: ['./bootstrap']
