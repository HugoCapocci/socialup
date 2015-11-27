define(['angular', 'app'], function(angular, app) {
    
    'use strict';

    function generateRouteProviders($routeProvider, route) {

        $routeProvider.when('/'+route, {
            templateUrl: 'views/'+route+'.html',
            controller: route.substring(0,1).toUpperCase()+route.substring(1)+'Controller',
            reloadOnSearch : false
        });

    }

	return app.config(['$routeProvider', function($routeProvider) {

        var routes = ['uploadFile', 'cloudExplorer', 'postMessage', 'login', 'scheduledEvents', 'manageSocialNetworks'];
        routes.forEach(function(route) {
            generateRouteProviders($routeProvider, route);
        });
	}]
  );

});