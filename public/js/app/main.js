require.config({
    paths : { 
        'domReady' : '../../bower_components/requirejs-domready/domReady',
        'angular' : '../../bower_components/angular/angular.min',
        'angular-resource' : '../../bower_components/angular-resource/angular-resource.min',
        'angular-route' : '../../bower_components/angular-route/angular-route.min',
        'angular-bootstrap' : '../../bower_components/angular-bootstrap/ui-bootstrap',
        'angular-bootstrap-tpls' : '../../bower_components/angular-bootstrap/ui-bootstrap-tpls',
        'angular-file-upload' : '../../bower_components/angular-file-upload/dist/angular-file-upload.min'
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
        }
    },
     // kick start application
    deps: ['./bootstrap']
});