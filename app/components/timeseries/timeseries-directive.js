'use strict';
/**
 * Timeseries directive.
 */
angular.module('timeseries')
.directive('timeseries', ['TimeseriesService', 'State',
  function (TimeseriesService, State) {
  return {
    link: function (scope) {

      scope.$watch('asset', function () {
        TimeseriesService.initializeTimeseriesOfAsset(scope.asset);

        if (State.context === 'map') {
          scope.timeseries.change();
        }

      });


      scope.$on('$destroy', function () {

        if (State.selected.assets.length > 1 && State.context === 'map') {
          _.forEach(State.selected.timeseries, function (ts) {
            ts.active = false;
          });
          TimeseriesService.syncTime();
        }

      });

    },
    restrict: 'E', // Timeseries can be an element with single-select or
                    // multi select as an attribute or without in which
                    // case it only sets the color and order of timeseries of
                    // new assets.
    scope: true // Share scope with select directive
  };
}]);

/**
 * Timeseries directive.
 */
angular.module('timeseries')
.config([ // stop the sanitation -- > SO: http://stackoverflow.com/questions/15606751/angular-changes-urls-to-unsafe-in-extension-page
  '$compileProvider',
  function($compileProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|http):/);
  }])


.directive('timeseriesSingleSelect', ['State', 'TimeseriesService',
  function (State, TimeseriesService) {
  return {
    link: function (scope) {

      var selectTimeseries = function () {
        var selectedTimeseries = scope.timeseries.selected.uuid;

        scope.timeseries.selected.url = window.location.protocol + '//'
            + window.location.host + '/api/v2/timeseries/' + selectedTimeseries
            + '/data/?format=csv&start=' + Math.round(scope.timeState.start)
            + '&end=' + Math.round(scope.timeState.end);

        State.selected.timeseries.forEach(function (ts) {
          if (_.find(scope.asset.timeseries, {uuid: ts.uuid})) {
            ts.active = ts.uuid === selectedTimeseries;
          }
        });

        TimeseriesService.syncTime().then(getContentForAsset);

      };


      var getContentForAsset = function (timeseries) {
        console.log(timeseries.filter(function (ts) {
          return _.some(scope.asset.timeseries, {uuid: ts.id});
        }));


        scope.content = timeseries.filter(function (ts) {
          return _.some(scope.asset.timeseries, {uuid: ts.id});
        });
      };

      scope.timeseries = {
        selected: {uuid: 'empty'},
        change: function () {
          selectTimeseries();
        }
      };


      scope.$watch('asset', function () {

        var setFirstTSAsSelected = function () {
          scope.timeseries.selected = scope.asset.timeseries[0];
        };

        var activeTs = _.find(State.selected.timeseries, {active: true});
        if (activeTs) {
           var tsInAsset = _.find(
            scope.asset.timeseries,
            function (ts) { return ts.uuid === activeTs.uuid;}
          );
          if (tsInAsset) {
            scope.timeseries.selected = tsInAsset;
          }
          else {
            setFirstTSAsSelected();
          }
        }
        else {
          setFirstTSAsSelected();
        }

        scope.timeseries.change();

      });

      /**
       * Get new ts when time changes
       */
      scope.$watch('timeState.timelineMoving', function (newValue, oldValue) {
        if (!newValue && newValue !== oldValue) {
          TimeseriesService.syncTime().then(getContentForAsset);
        }
      });

    },
    restrict: 'A',
    templateUrl: 'timeseries/timeseries.html',
    scope: true // Share scope with timeseries directive
  };
}]);
