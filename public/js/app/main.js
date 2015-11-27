require.config({
    paths : { 
        'domReady' : '../../bower_components/requirejs-domready/domReady',
        'angular' : '../../bower_components/angular/angular.min',
        'angular-resource' : '../../bower_components/angular-resource/angular-resource.min',
        'angular-route' : '../../bower_components/angular-route/angular-route.min',
        'angular-bootstrap' : '../../bower_components/angular-bootstrap/ui-bootstrap',
        'angular-bootstrap-tpls' : '../../bower_components/angular-bootstrap/ui-bootstrap-tpls',
        'angular-file-upload' : '../../bower_components/angular-file-upload/dist/angular-file-upload.min',
        'angular-tree-control' : '../../bower_components/angular-tree-control/angular-tree-control',
        'ng-tags-input' : '../../bower_components/ng-tags-input/ng-tags-input',
        'sha1' : '../../bower_components/SHA-1/sha1',
        'angular-smart-table' : '../../bower_components/angular-smart-table/dist/smart-table'
    },
    shim : {
        'angular' : {
            'exports' : 'angular'
        },
        'angular-route' : [ 'angular' ],       
        'angular-resource' : {
            deps : ['angular']
        },
        'angular-bootstrap' : {
            deps : ['angular']
        },
        'angular-bootstrap-tpls' : {
            deps : ['angular']
        },
        'angular-file-upload' : {
            deps : ['angular']
        },
        'angular-tree-control' : {
            deps : ['angular']
        },
        'ng-tags-input' : {
             deps : ['angular']
        },
        'angular-smart-table' : {
             deps : ['angular']
        }
    },
    // kick start application
    deps: ['./bootstrap']
});