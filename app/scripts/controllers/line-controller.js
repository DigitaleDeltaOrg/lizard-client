angular.module('lizard-nxt')
  .controller('LineCtrl', [
  '$scope',
  'RasterService',
  'ClickFeedbackService',
  'UtilService',
  '$q',
  function ($scope, RasterService, ClickFeedbackService, UtilService, $q) {

    $scope.box.content = {};

    /**
     * @function
     * @memberOf app.lineCtrl
     * @description Loops over all layergroups to request data
     * @param  array of L.LatLng objects describing the line.
     */
    var fillLine = function (line) {
      ClickFeedbackService.startVibration($scope.mapState);
      //TODO draw feedback when loading data
      var promises = $scope.fillBox({
        geom: line,
        start: $scope.timeState.start,
        end: $scope.timeState.end
      });
      angular.forEach(promises, function (promise) {
        promise.then(null, null, function (response) {
          if (response.data && response.layerSlug === 'ahn2/wss') {
            $scope.box.content[response.layerGroupSlug]
              .layers[response.layerSlug]
              // Since the data is not properly formatted in the back
              // we convert it from degrees to meters here
              .data = UtilService.dataConvertToMeters(response.data);
          }
        });
      });
      // Draw feedback when all promises are resolved
      $q.all(promises).then(function () {
        var feedbackDrawn = false;
        angular.angular.forEach($scope.box.content, function (lg) {
          if (lg && lg.isActive() && lg.layers) {
            angular.forEach(lg.layers, function (layer) {
              if (layer && layer.data) {
                console.log('stop');
                ClickFeedbackService.stopVibration();
                feedbackDrawn = true;
              }
            });
          }
        });
        if (!feedbackDrawn) {
          ClickFeedbackService.vibrateOnce();
        }
      });
    };

    /**
     * Updates firsClick and or secondClick and draws
     * appropriate feedback
     *
     * It either:
     *   1. Removes the current line
     *   2. Sets firstClick and draws a tiny line from the first
     *      click to the current pos of mouse.
     *   3. Sets the second click and draws the lne from
     *      the first to the second.
     */
    $scope.$watch('mapState.here', function (n, o) {
      if (n === o) { return true; }
      ClickFeedbackService.emptyClickLayer($scope.mapState);
      if ($scope.mapState.points.length === 2) {
        $scope.mapState.points = [];
        // Empty data element since the line is gone
        $scope.box.content = {};
      } else {
        if ($scope.mapState.points.length === 1) {
          $scope.mapState.points[1] = $scope.mapState.here;
          ClickFeedbackService.drawLine($scope.mapState, $scope.mapState.points[0], $scope.mapState.points[1], true);
          fillLine($scope.mapState.points);
        } else {
          $scope.mapState.points[0] = $scope.mapState.here;
          ClickFeedbackService.drawLine($scope.mapState, $scope.mapState.points[0], $scope.mapState.userHere, true);
        }
      }
    });

    var watchIfUrlCtrlSetsPoints = $scope.$watch('mapState.points', function (n, o) {
      if ($scope.mapState.points.length === 2) {
        fillLine($scope.mapState.points);
        ClickFeedbackService.drawLine($scope.mapState, $scope.mapState.points[0], $scope.mapState.points[1], true);
        // Delete this watch
        watchIfUrlCtrlSetsPoints();
      }
    });

    /**
     * Updates line according to geo-pos of mouse
     */
    $scope.$watch('mapState.userHere', function (n, o) {
      if (n === o) { return true; }
      if ($scope.mapState.points[0] && !$scope.mapState.points[1]) {
        ClickFeedbackService.emptyClickLayer($scope.mapState);
        ClickFeedbackService.drawLine($scope.mapState, $scope.mapState.points[0], $scope.mapState.userHere, true);
      }
    });

    /**
     * Updates line data when users changes layers.
     */
    $scope.$watch('mapState.layerGroupsChanged', function (n, o) {
      if (n === o) { return true; }
      if ($scope.mapState.points.length === 2) {
        fillLine($scope.mapState.points);
      }
    });

    /**
     * Updates line of temporal layers when timeState.at changes.
     */
    $scope.$watch('timeState.at', function (n, o) {
      angular.forEach($scope.line, function (line, slug) {
        if ($scope.mapState.layerGroups[slug].temporal) {
          line.data = UtilService.createDataForTimeState(line.result, $scope.timeState);
        }
      });
    });

    /**
     * Reload data from temporal rasters when temporal zoomended.
     */
    $scope.$watch('timeState.zoomEnded', function (n, o) {

      if (n === o) { return true; }
      if ($scope.mapState.points.length === 2) {
        var line = UtilService.createLineWKT($scope.mapState.points[0], $scope.mapState.points[1]);
        var dataProm, layerGroup;
        angular.forEach($scope.line, function (line, slug) {

          layerGroup = $scope.mapState.layerGroups[slug];
          if (layerGroup.temporal) {

            //dataProm = RasterService.getRasterData(slug, line, $scope.timeState.start, $scope.timeState.end, {});
            dataProm = layerGroup.getData(line);

            // Pass the promise to a function that handles the scope.
            putDataOnScope(dataProm, slug);
          }
        });
      }
    });

    /**
     * Legacy function to draw 'bolletje'
     *
     * TODO
     */
    var circle;
    $scope.$watch('box.mouseLoc', function (n, o) {
      if (n === o) { return true; }
      if ($scope.box.mouseLoc) {
        // local vars declaration.
        var lat1, lat2, lon1, lon2, maxD, d, r, dLat, dLon, posLat, posLon;

        lat1 = $scope.mapState.points[0].lat;
        lat2 = $scope.mapState.points[1].lat;
        lon1 = $scope.mapState.points[0].lng;
        lon2 = $scope.mapState.points[1].lng;
        maxD = Math.sqrt(Math.pow((lat2 - lat1), 2) + Math.pow((lon2 - lon1), 2));
        d = UtilService.metersToDegs($scope.box.mouseLoc);
        r = d / maxD;
        dLat = (lat2 - lat1) * r;
        dLon = (lon2 - lon1) * r;
        posLat = dLat + lat1;
        posLon = dLon + lon1;
        if (circle === undefined) {
          circle = L.circleMarker([posLat, posLon], {
              color: '#34495e',
              opacity: 1,
              fillOpacity: 1,
              radius: 5
            });
          $scope.mapState.addLayer(circle);
        } else {
          circle.setLatLng([posLat, posLon]);
        }
      }
      else {
        if (circle !== undefined) {
          $scope.mapState.removeLayer(circle);
          circle = undefined;
        }
      }
    });

    /**
     * Clean up all drawings on box change.
     */
    $scope.$on('$destroy', function () {
      ClickFeedbackService.emptyClickLayer($scope.mapState);
      $scope.mapState.points = [];
    });

  }
]);
