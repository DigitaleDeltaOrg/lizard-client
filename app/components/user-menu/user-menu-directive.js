/**
 *
 * Shows user-menu and has logout login buttons
 */
angular.module('user-menu')
  .directive('userMenu', ['UtilService', '$location',
              function (UtilService, $location) {

    var link = function (scope, element, attrs) {

      scope.showApps = false;

      var appsScreenUrl = function() {
        var appsScreenSlug = UtilService.slugify($location.host());
        return "//apps.lizard.net/screens/" + appsScreenSlug + ".js";
      };

      var script = document.createElement('script');
      script.src = appsScreenUrl();
      script.onload = function () {
        if (typeof window.Lizard.startPlugins === 'function') {
          window.Lizard.startPlugins(); // jshint ignore:line
          scope.showApps =  element
            .find('#lizard-apps-button')
            .children().length > 0;
          scope.$digest();
        }
      };

      document.head.appendChild(script);

    };

    return {
      restrict: 'E',
      link: link,
      templateUrl: 'user-menu/user-menu.html'
    };
  }]);
