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
    'ng-videosharing-embed',
    'angular-chart',
    'angular-drag-and-drop-lists',
    'angular-bootstrap-calendar',
    '../services/index',
    '../controllers/index',
    './directives',
    './filters'
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
            'videosharing-embed',
            'chart.js',
            'dndLists',
            'mwl.calendar',
            'SocialUp.services',
            'SocialUp.controllers',
            'SocialUp.directives',
            'SocialUp.filters'
        ]);
});

//angularFileUpload