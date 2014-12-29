/**
 * Lizard-client global state object.
 */
angular.module('global-state')
  .service('State', ['dataLayers',
    function (dataLayers) {

    var state = {};

    /**
     * returns a function that returns a string representation of the provided
     * attribute of the state. When the state. does not exist, it returns a
     * function that returns "undefined". Useful to $watch the state.
     */
    state.toString = function (stateStr) {
      return function () {
        var property = state;
        angular.forEach(stateStr.split('.'), function (accessor) {
          if (property) {
            property = property[accessor];
          }
        });
        if (typeof property === 'string') {
          return property;
        } else {
          return JSON.stringify(property);
        }
      };
    };

    // Context. State.context returns 'map' or 'db', it can only be set with
    // either one of those values.
    var _context = 'map';
    var CONTEXT_VALUES = ['map', 'db'];
    Object.defineProperty(state, 'context', {
      get: function () { return _context; },
      set: function (context) {
        if (CONTEXT_VALUES.indexOf(context) > -1) {
          _context = context;
        } else {
          throw new Error("Attemped to assign an illegal value ('"
            + context
            + "') to state.context. Only ["
            + CONTEXT_VALUES.join(',')
            + "] are accepted values."
          );
        }
      }
    });

    // State of data layer groups, stores slugs of all layergroups and the
    // active layergroups.
    state.layerGroups = {
      all: [], // Immutable representation of all layergroups
      active: [],
      isLoading: false, // Either gettingData or syncingTime, DataService is busy
      gettingData: false, // Making server requests through DataService
      syncingTime: false // Getting new layers and so on
    };

    // Box
    state.box = {};

    var _type = 'point'; // Default box type
    var TYPE_VALUES = ["point", "line", "area"];
    Object.defineProperty(state.box, 'type', {
      get: function () { return _type; },
      set: function (type) {
        if (TYPE_VALUES.indexOf(type) > -1) {
          _type = type;
        } else {
          throw new Error("Attemped to assign an illegal value ('"
            + type
            + "') to state.box.type. Only ["
            + TYPE_VALUES.join(',')
            + "] are accepted values."
          );
        }
      }
    });

    // Spatial
    state.spatial = {
      here: {},
      points: [], // History of here for drawing and creating line and polygons
      bounds: {},
      zoom: {},
      userHere: {}, // Geographical location of the users mouse only set by
                    // map-directive when box type is 'line'
      mapMoving: false
    };

    // Temporal
    var now = Date.now(),
        hour = 60 * 60 * 1000,
        day = 24 * hour,
        MIN_TIME_FOR_EXTENT = (new Date(2010, 0, 0, 0, 0, 0, 0)).getTime(),
        MAX_TIME_FOR_EXTENT = (new Date(2015, 0, 0, 0, 0, 0, 0)).getTime();

    state.temporal = {
      at: Math.round(now - 2.5 * day),
      aggWindow: 1000 * 60 * 5,
      buffering: false,
      timelineMoving: false,
      resolution: null,
      playing: false,
      start: null, // defined below
      end: null // defined below
    };

    // State.temporal.start must be higher than MIN_TIME_FOR_EXTENT
    var _start = now - 6 * day;
    Object.defineProperty(state.temporal, 'start', {
      get: function () { return _start; },
      set: function (start) {
        _start = start;
      }
    });

    // State.temporal.end must be lower than MAX_TIME_FOR_EXTENT
    var _end = now + day;
    Object.defineProperty(state.temporal, 'end', {
      get: function () { return _end; },
      set: function (end) { _end = end; }
    });

    return state;
  }]);
