'use strict';

app.controller('hashGetterSetter', ["$scope", "hashSyncHelper",
  function ($scope, hashSyncHelper) {

    // Only set url when user changed it or on pageload
    // Watches are asynchronous, so they all need their
    // own update boolean.
    var updateBaseLayerUrl = true,
      updateLocationUrl = true,
      updateStartUrl = true,
      updateEndUrl = true;

    /**
     * Set baselayer hash when activeBaselayer changed.
     */
    $scope.$watch('mapState.activeBaselayer', function (n, o) {
      if (n === o) { return true; }
      updateBaseLayerUrl = false;
      setBaselayerUrl($scope.mapState.activeBaselayer);
    });

    /**
     * Set location hash when map moved.
     */
    $scope.$watch('mapState.moved', function (n, o) {
      if (n === o) { return true; }
      updateLocationUrl = false;
      setCoordinatesUrl();
    });

    /**
     * Set start hash when timeState.start changed.
     */
    $scope.$watch('timeState.start', function (n, o) {
      if (n === o) { return true; }
      updateStartUrl = false;
      setTimeStateUrl($scope.timeState.start, true);
    });

    /**
     * Set end hash when timeState.end changed.
     */
    $scope.$watch('timeState.end', function (n, o) {
      if (n === o) { return true; }
      updateEndUrl = false;
      setTimeStateUrl($scope.timeState.end, false);
    });

    /**
     * Updates hash with new time.
     * 
     * @param {int]} time  to set in hash in ms from epoch
     * @param {boolean} start if true sets start else it sets end
     */
    var setTimeStateUrl = function (time, start) {
      var date = new Date(time);
      var dateString = date.toDateString()
        .slice(4) // Cut off day name
        .split(' ') // Replace spaces by hyphens
        .join('-');
      if (start) {
        hashSyncHelper.setHash({'start': dateString});
      } else {
        hashSyncHelper.setHash({'end': dateString});
      }
    };

    /**
     * Sets the coordinates in the hash with a precision
     * of 4 decimals.
     */
    var setCoordinatesUrl = function () {
      var COORD_PRECISION = 4;
      var newHash = [
        $scope.map.getCenter().lat.toFixed(COORD_PRECISION),
        $scope.map.getCenter().lng.toFixed(COORD_PRECISION),
        $scope.map.getZoom()
      ].join(',');
      if (!$scope.$$phase) {
        $scope.$apply(function () {
          hashSyncHelper.setHash({'location': newHash});
        });
      } else {
        hashSyncHelper.setHash({'location': newHash});
      }
    };

    /**
     * Updates activeBaselayer in hash.
     * 
     * @param {int} baselayerId id of active baselayer
     */
    var setBaselayerUrl = function (baselayerId) {
      hashSyncHelper.setHash({'baselayer': baselayerId}); // set baselayer in url by id
    };

    /**
     * Sets up the hash at creation of the controller.
     */
    (function setUrlHashWhenEmpty() {
      var hash = hashSyncHelper.getHash();

      var baselayerHash = hash.baselayer;
      var locationHash = hash.location;

      if (!locationHash) {
        setCoordinatesUrl();
      }
      if (!baselayerHash) {
        setBaselayerUrl($scope.mapState.activeBaselayer);
      }
    })();

    /**
     * Listener to update map view when user changes url
     *
     * updateUrl is set to false when the application updates
     * the url. Then, this listener is fired but does nothing but
     * resetting the updateUrl back to true
     */
    $scope.$on('$locationChangeSuccess', function (e, oldurl, newurl) {
      var hash = hashSyncHelper.getHash();
      if (updateBaseLayerUrl) {

        var baselayerHash = hash.baselayer;
        if (baselayerHash !== undefined) {
          $scope.mapState.activeBaselayer = parseInt(baselayerHash, 10);
          $scope.mapState.changeBaselayer();
        }
      }
      if (updateLocationUrl) {
        var locationHash = hash.location;
        if (locationHash !== undefined) {
          var latlonzoom = locationHash.split(',');
          if (latlonzoom.length >= 3) { // must have 3 parameters or don't setView here...
            if (parseFloat(latlonzoom[0]) && parseFloat(latlonzoom[1]) && parseFloat(latlonzoom[2])) {
              $scope.map.setView([latlonzoom[0], latlonzoom[1]], latlonzoom[2], {reset: true, animate: true});
            }
          }
        }
      }
      if (updateStartUrl) {
        var startHash = hash.start;
        if (startHash !== undefined) {
          $scope.timeState.start = Date.parse(startHash);
        }
      }
      if (updateEndUrl) {
        var endHash = hash.end;
        if (endHash !== undefined) {
          $scope.timeState.end = Date.parse(endHash);
        }
      }
      updateBaseLayerUrl = true;
      updateLocationUrl = true;
      updateStartUrl = true;
      updateEndUrl = true;
    });

  }
]);