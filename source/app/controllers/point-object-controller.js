'use strict';

/**
 * pointObject is the contoller of the pointObject template. It gathers all data
 * belonging to a location in space. It becomes active by setting box.type to
 * 'pointObject' and is updated by broadcasting 'newPointActive'. It reads and
 * writes mapState.here.
 *
 * TODO:
 * - [ ] Include the click action on individual events into this paradigm.
 */

app.controller('pointObjectCtrl', ["$scope", "$filter", "CabinetService",
    "RasterService", "EventService", "TimeseriesService", "UtilService",
    "UtfGridService", "ClickFeedbackService",
  function ($scope,
            $filter,
            CabinetService,
            RasterService,
            EventService,
            TimeseriesService,
            UtilService,
            UtfGridService,
            ClickFeedbackService
  ) {

    /**
     * pointObject is the object which holds all data of a point
     * in space. It is updated after a users click. The pointObject
     * may have associated events and timeseries which are requested
     * from the server by the services.
     *
     * @return {object} empty pointObject.
     */
    var createPointObject = function () {
      var pointObject = {
        streetview: {
          active: false
        },
        attrs: {
          active: false,
          data: {},
          wanted: CabinetService.wantedAttrs
        },
        temporalRaster: {
          type: undefined,
          active: false,
          start: undefined,
          stop: undefined,
          aggWindow: RasterService.rasterInfo().timeResolution,
          data: undefined,
          recurrenceTime: undefined
        },
        timeseries: {
          active: false,
          data: [],
          selectedTimeseries: null
        },
        events: {
          active: false,
          data: []
        }
      };
      return pointObject;
    };


    var fillPointObject = function (map, here, extra) {

      var clickedOnEvents = extra && extra.type === 'events';

      if (clickedOnEvents) {
        eventResponded(extra.eventData);
      } else {
        // Give feedback to user
        ClickFeedbackService.drawClickInSpace(map, here);
      }
      // Get attribute data from utf
      UtfGridService.getDataFromUTF(map, here)
        .then(utfgridResponded(map, here, clickedOnEvents))
        .then(function () {
          getRasterForLocation();
        });
    };

    var utfgridResponded = function (map, here, showOnlyEvents) {
      return function (response) {

        if (!showOnlyEvents) {
          attrsResponded(response, $scope.pointObject);
          ClickFeedbackService.stopVibration();
        } else {
          ClickFeedbackService.stopVibration();
        }

        // Either way, stop vibrating click feedback.

        if (response && response.data) {

          $scope.pointObject.attrs.active = !showOnlyEvents;

          // Set here to location of object
          var geom = JSON.parse(response.data.geom);
          here = {lat: geom.coordinates[1], lng: geom.coordinates[0]};
          // Draw feedback around object.
          ClickFeedbackService.drawGeometry(
            map,
            response.data.geom,
            response.data.entity_name
          );
          var entity = $scope.pointObject.attrs.data.entity_name;
          var id = $scope.pointObject.attrs.data.id;
          // Get events belonging to object.
          EventService.getEvents(
            showOnlyEvents ? {} : {object: entity + '$' + id}
          )
          .then(eventResponded);
          // Get timeseries belonging to object.
          getTimeSeriesForObject();
        } else {
          // If not hit object, threaten it as a rain click, draw rain click
          // arrow.
          ClickFeedbackService.drawArrowHere(map, here);
        }
      };
    };

    /**
     * Goes through layers and selects the temporal layer
     * that is active. If there is none, nothing happens.
     * @return {void}
     */
    var getRasterForLocation = function () {
      var layer, lIndex, stop, start;
      for (lIndex in $scope.mapState.layers) {
        layer = $scope.mapState.layers[lIndex];
        if (layer.active && layer.temporal) {
          getRasterForLayer(layer);
        }
      }
    };

    /**
     * Gets a layer and retrieves data based
     * on temporal extent etc.
     * @param  {object} layer Layer object, containing name, slug..
     * @return {void}
     */
    var getRasterForLayer = function (layer) {
      var stop = new Date($scope.timeState.end),
          start = new Date($scope.timeState.start);
      $scope.pointObject.temporalRaster.aggWindow =
        UtilService.getAggWindow($scope.timeState.start,
                                 $scope.timeState.end,
                                 272);  // graph is 272 px wide
      RasterService.getTemporalRaster(
        start,
        stop,
        $scope.mapState.here,
        $scope.pointObject.temporalRaster.aggWindow,
        layer.slug)
        .then(rasterLayerResponded)
        .then(function () {
          $scope.pointObject.temporalRaster.type = layer.slug;
          RasterService.getTemporalRaster(
            start,
            stop,
            $scope.mapState.here,
            $scope.pointObject.temporalRaster.aggWindow,
            layer.slug,
            'rrc')
              .then(function (response) {
                $scope.pointObject.temporalRaster.recurrenceTime = response;
              }
          );
        });
    };

    /**
     * Sets data attributes if a response returned properly
     * @param  {object} response Response from rasterService. (data-array)
     * @return {void}
     */
    var rasterLayerResponded = function (response) {
      $scope.pointObject.temporalRaster.active = true;
      $scope.pointObject.temporalRaster.data = response;
      $scope.pointObject.temporalRaster.end =
        $scope
         .pointObject
         .temporalRaster
         .data[$scope.pointObject.temporalRaster.data.length - 1][0];
      $scope.pointObject.temporalRaster.start =
        $scope.pointObject.temporalRaster.data[0][0];
    };

    var getTimeSeriesForObject = function () {
      // $scope.pointObject.timeseries.data =
      //   TimeseriesService.getRandomTimeseries();
      // $scope.pointObject.timeseries.selectedTimeseries =
      //   $scope.pointObject.timeseries.data[0];
      // $scope.pointObject.timeseries.active = true;
    };

    var eventResponded = function (response) {
      $scope.pointObject.events.data = [];
      angular.forEach(response.features, function (feature) {
        feature.properties.geometry = feature.geometry;
        $scope.pointObject.events.data.push(feature.properties);
      });
      if ($scope.pointObject.events.data.length > 0) {
        $scope.pointObject.events.active = true;
        EventService.addColor($scope.events);
      }
    };

    var attrsResponded = function (data) {
      // Return directly if no data is returned from the UTFgrid
      if (!data.data) { return; }
      angular.extend($scope.pointObject.attrs.data, data.data);
    };

    $scope.pointObject = createPointObject();
    fillPointObject($scope.map, $scope.mapState.here);

    $scope.$on('newPointObject', function (msg, extra) {
      $scope.pointObject = createPointObject();
      fillPointObject($scope.map, $scope.mapState.here, extra);
    });

    $scope.$on('$destroy', function () {
      ClickFeedbackService.emptyClickLayer($scope.map);
    });

    var _watchAttrAndEventActivity = function (n, o) {

      //console.log('$scope.pointObject.events', $scope.pointObject.events);

      var checkIfAttrsActive  = $scope.pointObject.attrs.active,
          checkIfEventsActive = $scope.pointObject.events.active;

      if (checkIfEventsActive && !checkIfAttrsActive) {

        // Since we clearly clicked an event feature/circle,
        // we need to kill both the vibrator and the locationmarker:

        ClickFeedbackService.killVibrator();
        ClickFeedbackService.removeLocationMarker();

      } else if (!checkIfEventsActive && checkIfAttrsActive) {

        // Since we clicked on something else than an event
        // circle/feature, we go find the black one and give
        // it it's initial color.

        _recolorBlackEventFeature();
        ClickFeedbackService.removeLocationMarker();

      } else if (!checkIfEventsActive && !checkIfAttrsActive) {

        _recolorBlackEventFeature();
      }
    };

    // efficient $watches using a helper function.
    $scope.$watch('pointObject.attrs.active',  _watchAttrAndEventActivity);
    $scope.$watch('pointObject.events.active', _watchAttrAndEventActivity);

    var _recolorBlackEventFeature = function () {

      var feature = d3.select('.highlighted-event');

      if (feature[0][0]) {

        feature
          .classed("highlighted-event", false)
          .attr("fill", feature.attr("data-init-color"));
      }
    };

    $scope.mustShowRainCard = function () {

      var activeTemporalLayer = $scope.mapState.getActiveTemporalLayer();
      var rainIsInactive =
            !($scope.pointObject.temporalRaster.type === 'demo:radar'
                && activeTemporalLayer
                && activeTemporalLayer.slug === 'demo:radar'
              );

      if (!rainIsInactive) {

        var i, data = $scope.pointObject.temporalRaster.data;

        for (i = 0; i < data.length; i++) {
          if (data[i][1] !== null) {
            return true;
          }
        }
      }
      return false;
    };
  }
]);
