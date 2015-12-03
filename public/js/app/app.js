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
    'angular-smart-table',
    'checklist-model',
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
            'smart-table',
            'checklist-model',
            'SocialUp.services',
            'SocialUp.controllers'
        ]);
});

//angularFileUpload