// rain-aggregate-directives.js
'use strict';

app.directive('rainAggregate', function ($q, CabinetService) {
  return {
    restrict: "A",
    require: 'map',
    link: function (scope, element, attrs, mapCtrl) {

      var statWinWatch =  function (n, o) {
        if (n === o) {return true; }
        var callback = function (response) {
          scope.rain.data = response.result;
        };
        getRain(new Date(scope.rain.start),
          new Date(scope.rain.end),
          scope.rain.latLng,
          callback,
          scope.rain.interval,
          scope.rain.statWin
        );
      };

      scope.$watch('timeState.end', function (n, o) {
        if (n === o || scope.box.type !== 'rain') { return true; }
        var firstTime;
        if (scope.timeState.end > scope.rain.end) {
          if (firstTime === undefined) {
            getMoreRain();
            firstTime = true;
          } else if (scope.timeState.end > scope.rain.end - 10 * scope.rain.interval) {
            getMoreRain();
          }
        }
      });

      var getMoreRain = function (starty) {
        var stop, start;
        if (starty) {
          start = scope.rain.start - 20 * scope.rain.interval;
          stop = scope.rain.end;
        } else {
          stop = scope.rain.end + 20 * scope.rain.interval;
          start = scope.rain.start;
        }
        var callback = function (response) {
          console.log(response, scope.rain.data.concat(response.result));
          scope.rain.data = scope.rain.data.concat(response.result);
          scope.rain.end = scope.rain.data[scope.rain.data.length - 1][0];
          scope.rain.start = scope.rain.data[0][0];
        };
        getRain(new Date(start),
          new Date(stop),
          scope.rain.latLng,
          callback,
          scope.rain.interval,
          scope.rain.statWin
        );
      };

      // scope.$watch('timeState.start', function (n, o) {
      //   if (n === o || scope.box.type !== 'rain') { return true; }
      //   scope.rain.rainClick();
      // });

      scope.rain.rainClick = function (e) {
        var stop = new Date(scope.timeState.end);
        var start = new Date(scope.timeState.start);
        scope.rain.latLng = e.latlng;
        var nBars = 20;
        scope.rain.interval = 17280000;
        scope.rain.statWin = 60 * 60 * 1000; // 1 hour
        scope.box.type = 'rain';
        scope.$watch('rain.statWin', statWinWatch);
        var callback = function (response) {
          scope.rain.data = response.result;
          scope.rain.end = scope.rain.data[scope.rain.data.length - 1][0];
          scope.rain.start = scope.rain.data[0][0];
          scope.rain.nbar = nBars;
        };
        getRain(start, stop, scope.rain.latLng, callback, scope.rain.interval, scope.rain.statWin);
      };

      /**
       * Gets rain from the server
       *
       * @param  {int} start    start of rainserie
       * @param  {int} stop     end of rainserie
       * @param  {function} callback function
       * @param  {object} latLng   location of rainserie in {lat: int, lng: int} (currently only supports points)
       * @param  {int} interval width of the aggregation, default: stop - start / 100
       * @param  {int} statWin   window for the min/max, default: 5 min
       */
      var getRain = function (start, stop, latLng, callback, interval, statWin) {
        var stopString = stop.toISOString().split('.')[0];
        var startString = start.toISOString().split('.')[0];
        var wkt = "POINT(" + latLng.lng + " " + latLng.lat + ")";
        if (interval === undefined) {
          interval = (stop - start) / 100;
        }
        if (statWin === undefined) {
          statWin = 300000;
        }
        CabinetService.raster.get({
          raster_names: 'rain',
          geom: wkt,
          srs: 'EPSG:4236',
          start: startString,
          stop: stopString,
          interval: interval,
          stat_win: statWin
        }).then(callback);
      };

      var cleanup = scope.$watch('tools.active', function (newVal, oldVal) {
        if (newVal === oldVal) { return; }
        if (newVal !== 'rain') {
          scope.map.off('click', scope.rain.rainClick);
        }
        if (scope.tools.active === 'rain') {
          scope.map.on('click', scope.rain.rainClick);
        }
      });
    }
  };
});