// TODO protéger zone admin par un filtre
// TODO protéger tous les post/put/delete par un filtre
define([
    'angular',
    'angular-resource',
    'angular-route',
    'angular-bootstrap',
    'angular-bootstrap-tpls',
    'angular-file-upload',
    'angular-tree-control',
    'ng-tags-input',
    '../services/index',
    '../controllers/index' 
    ], function (angular) {
    
    'use strict';
        
        return angular.module('SocialUp', [
            'ngResource',
            'ngRoute',
            'ui.bootstrap',
            'ui.bootstrap.tpls',
            'angularFileUpload',
            'treeControl',
            'ngTagsInput',
            'SocialUp.services',
            'SocialUp.controllers'
        ]);
});

//angularFileUpload