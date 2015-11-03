'use strict';

// TODO protéger zone admin par un filtre
// TODO protéger tous les post/put/delete par un filtre
define([
    'angular',
    'angular-resource',
    'angular-route',
    'angular-bootstrap',
    'angular-bootstrap-tpls',
    'angular-file-upload',
    '../services/index',
    '../controllers/index' 
    ], function (angular) {
        
        return angular.module('SocialUp', [
            'ngResource',
            'ngRoute',
            'ui.bootstrap',
            'ui.bootstrap.tpls',
            'angularFileUpload',
            'SocialUp.services',
            'SocialUp.controllers'
        ]);
});

//angularFileUpload