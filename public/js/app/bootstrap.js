/**
 * bootstraps angular onto the window.document node
 */
define([
    'require',
    'angular',
    'app',
    'routes'
], function (require, angular, app) {
    'use strict';

    require(['domReady!'], function (document) {
        console.log("domReady");
        angular.bootstrap(document, ['SocialUp']);
    });

});