'use strict';

define(['angular', 'app'], function(angular, app) {
    
    console.log('routes.js, app: ',app);

	return app.config(['$routeProvider', function($routeProvider) {
	    
        $routeProvider.when('/uploadFile', {
            templateUrl: 'views/uploadFile.html',
            controller: 'UploadFileController',
            reloadOnSearch : false
        });
        
    /*    $routeProvider.when('/', {
            templateUrl: 'views/home.html',
            controller: 'HomeController'
        });*/
        
	}]
  );

});