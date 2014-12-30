'use strict';

/**
 * @ngdoc controller
 * @class UrlController
 * @memberof app
 * @name UrlController
 * @summary Sets and gets the url to the state and vice versa.
 * @description UrlController reacts to $locationChangeSucces to read
 * the url and configure lizard-nxt state accordingly. Writes state
 * changes to url. At initial load of app, url leads. Afterwards the
 * state leads the url.
 */
angular.module('lizard-nxt')
  .controller('UrlController', ['$scope', 'LocationGetterSetter',
  'UrlState', 'dataBounds', 'DataService', 'MapService', 'State', '$rootScope',
  function ($scope,
            LocationGetterSetter,
            UrlState,
            dataBounds,
            DataService,
            MapService,
            State,
            $rootScope) {

    // Configuration object for url state.
    var state = {
      context: { // Locally used name for the state
        value: 'map', // default
        part: 'path', // Part of the url where this state is stored,
        index: 0, // Position of the state in the part
        update: true // When false, $locationChangeSucces is cancelled
      },
      layerGroups: {
        part: 'path',
        index: 1,
        update: true
      },
      boxType: {
        part: 'path',
        index: 2,
        update: true
      },
      geom: {
        part: 'path',
        index: 3,
        update: true
      },
      mapView: {
        part: 'at',
        index: 0,
        update: true
      },
      timeState: {
        part: 'at',
        index: 1,
        update: true
      }
    };

   /**
    * @function
    * @memberOf app.UrlController
    * @summary Enables or disables layerGroups on the basis of the url.
    * @description Takes the layerGroups as defined in the url to turn
    *              layerGroups on afterwards it initializes all other
    *              layerGroups. This is done here so MapService does not turn
    *              on layerGroups which are turned of later by this controller.
    * @param {string} String representation of layerGroups on url
    */
    var enablelayerGroups = function (layerGroupString) {
      if (layerGroupString) {
        // Either layerGroups are on url
        State.layerGroups.active = layerGroupString.split(',');
        // Or layerGroups are not on url, turn default layerGroups on
      } else {
        DataService.setLayerGoupsToDefault();
      }
    };

   /**
    * @function
    * @memberOf app.UrlController
    * @summary Sets the mapView on the url or the url on the mapView
    * @description If mapView as string from the url is a parseable
    *              mapView, the map is set to this view. Else the map
    *              is set to bounds of data as defined by the server.
    * @param {string} String representation of mapView on url
    */
    var enableMapView = function (mapView) {
      var fn = function () {
        MapService.fitBounds(dataBounds);
      };

      if (mapView) {
        var view = UrlState.parseMapView(mapView);
        if (view) {
          MapService.setView(view.latLng, view.zoom, view.options);
        } else {
          fn();
        }
      } else {
        fn();
      }
    };

    /**
     * set layer(s) when these change.
     */
    $scope.$watch(State.toString('layerGroups.active'),
      function (n, o) {
        if (n === o) { return true; }
        state.layerGroups.update = false;
        UrlState.setlayerGroupsUrl(state, State.layerGroups.active);
      }
    );

    /**
     * Set location when map moved.
     */
    $scope.$watch(State.toString('spatial.bounds'), function (n, o) {
      if (n === o) { return true; }
      state.mapView.update = false;
      UrlState.setCoordinatesUrl(state,
        State.spatial.bounds.getCenter().lat,
        State.spatial.bounds.getCenter().lng,
        State.spatial.zoom
      );
    }, true);

    /**
     * Set timeState when timeState changed.
     */
    $scope.$watch(State.toString('temporal.timelineMoving'), function (n, o) {
      if (n === o) { return true; }
      if (!State.temporal.timelineMoving) {
        state.timeState.update = false;
        UrlState.setTimeStateUrl(state,
                                 State.temporal.start,
                                 State.temporal.end);
      }
    });

    /*
     * Set boxType when box.type changed
     */
    $scope.$watch(State.toString('box.type'), function (n, old) {
      if (n === old) { return true; }
      state.boxType.update = false;
      LocationGetterSetter.setUrlValue(
        state.boxType.part, state.boxType.index, State.box.type
      );

      if (old === 'point' || old === 'line') {
        // Remove geometry from url
        state.boxType.update = false;
        LocationGetterSetter.setUrlValue(
          state.geom.part, state.geom.index, undefined);
      }
    });

    /*
     * Set context when context changed
     */
    $scope.$watch(State.toString('context'), function (n, old) {
      if (n === old) { return true; }
      state.context.update = false;
      LocationGetterSetter.setUrlValue(
        state.context.part, state.context.index, $scope.context
      );
    });

    /**
     * Set geom when mapState.here changed and box.type is point.
     */
    $scope.$watch(State.toString('spatial.here'), function (n, o) {
      if (n === o || State.box.type !== 'point') { return true; }
      state.geom.update = false;
      UrlState.setgeomUrl(state,
                          State.box.type,
                          State.spatial.here,
                          State.spatial.points);
    });

    /**
     * Set geom when mapState.points changed and box.type is line.
     */
    $scope.$watch(State.toString('spatial.points'), function (n, o) {
      if (n === o || State.box.type !== 'line') { return true; }
      state.geom.update = false;
      UrlState.setgeomUrl(state,
                          State.box.type,
                          State.spatial.here,
                          State.spatial.points);
    }, true);

    /**
     * Listener to update map view when user changes url
     *
     * $locationChangeSucces is broadcasted by angular
     * when the hashSyncHelper in util-service changes the url
     *
     * updateUrl is set to false when the application updates
     * the url. Then, this listener is fired but does nothing but
     * resetting the updateUrl back to true
     */

    // $locationChangeSuccess is fired once when this controller is initialized.
    // We might move the time, so we set it to true, and the $on
    // $locationChangeSuccess sets it back to false to trigger the the rest of
    // the app to update to the time of the url.
    State.temporal.timelineMoving = true;

    $scope.$on('$locationChangeSuccess', function (e, oldurl, newurl) {
      if (UrlState.update(state)) {
        var boxType = LocationGetterSetter.getUrlValue(state.boxType.part,
                                                       state.boxType.index),
          geom = LocationGetterSetter.getUrlValue(state.geom.part,
                                                  state.geom.index),
          layerGroupsFromURL = LocationGetterSetter.getUrlValue(
            state.layerGroups.part, state.layerGroups.index),
          mapView = LocationGetterSetter.getUrlValue(state.mapView.part,
                                                     state.mapView.index),
          time = LocationGetterSetter.getUrlValue(state.timeState.part,
                                                  state.timeState.index),
          context = LocationGetterSetter.getUrlValue(state.context.part,
                                                     state.context.index);

        LocationGetterSetter.setUrlValue(state.context.part,
                                         state.context.index,
                                         state.context.value);
        if (boxType) {
          State.box.type = boxType;
        } else {
          LocationGetterSetter.setUrlValue(
            state.boxType.part, state.boxType.index, State.box.type);
        }
        if (geom) {
          State.spatial = UrlState.parseGeom(
            State.box.type, geom, State.spatial);
        }
        enablelayerGroups(layerGroupsFromURL);
        enableMapView(mapView);

        if (time) {
          State.temporal = UrlState.parseTimeState(time, State.temporal);
        } else {
          state.timeState.update = false;
          UrlState.setTimeStateUrl(
            state, State.temporal.start, State.temporal.end);
        }

        if (context) {
          State.context = context;
        }
      }
      State.temporal.timelineMoving = false;
      angular.forEach(state, function (value) {
        value.update = true;
      });
    });
  }
]);
