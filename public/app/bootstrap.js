
/*
 * bootstraps angular onto the window.document node
 */
define(['require', 'angular', 'app', 'routes'], function(require, angular, app) {
  return require(['domReady!'], function(document) {
    console.log("domReady");
    return angular.bootstrap(document, ['SocialUp'], {
      strictDi: true
    });
  });
});
