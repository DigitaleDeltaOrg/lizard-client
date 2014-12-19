

/**
 * @ngdoc service
 * @class NxtData /
 * @memberof app
 * @name NxtData
 * @requires $q, $injector, NxtMap and LayerGroup
 * @summary Encapsulates layergroups
 * @description NxtData service encapsulates layergroups from the server side
 *              configuration of layergroups. It enables to perform actions
 *              on all layergroups simultaneously. When provided with a string
 *              representation of the service containing the global map it
 *              it performs these actions on the map from this service, else
 *              it needs a map object when calling toggleLayerGroup and
 *              syncTime.
 */


angular.module('lizard-nxt')
  .factory('NxtData', ['$q', '$injector', 'NxtMap', 'LayerGroup', function ($q, $injector, NxtMap, LayerGroup) {

    // Layergroups are hard-coupled to the leaflet map, therefore NxtData keeps
    // a reference to the leaflet map. This reference is provided by the
    // data-service or a NxtMap instance by the layer-chooser directive.
    var mapProvider = {};

    function NxtData(serverSideLayerGroups, map) {
      this.layerGroups = createLayerGroups(serverSideLayerGroups);

      this.state = {
        isLoading: false
      };

      // Immutable representation of all layergroups
      Object.defineProperty(this.state.layerGroups, 'all', {
        value: Object.keys(this.layerGroups),
        writeable: false,
        configurable: false
      });

      Object.defineProperty(this.state.layerGroups, 'active', {
        get: function () {
          return this.layerGroups.filter(function (layerGroup) {
            return layerGroup.isActive();
          });
        },
      });

      // Map is a string pointing to a service containing the map
      if (map) { mapProvider = $injector.get(map); }
    }

    NxtData.prototype = {

      /**
       * @function
       * @memberOf app.NxtMap
       * @description Toggles a layergroup when layergroups should be toggled
       *              takes into account that baselayers should toggle eachother
       * @param  layerGroup layergroup that should be toggled
       */
      toggleLayerGroup: function (layerGroup, optionalMap) {
        // turn layer group on
        var map = optionalMap || mapProvider._map;
        if (!(layerGroup.baselayer && layerGroup.isActive())) {
          layerGroup.toggle(map);
        }
        if (layerGroup.baselayer) {
          angular.forEach(this.layerGroups, function (_layerGroup) {
            if (_layerGroup.baselayer
              && _layerGroup.isActive()
              && _layerGroup.slug !== layerGroup.slug
              )
            {
              _layerGroup.toggle(map);
            }
          });
        }
      },

      syncTime: function (timeState) {
        var defer = $q.defer();
        var promises = [];
        angular.forEach(this.layerGroups, function (layerGroup) {
          promises.push(layerGroup.syncTime(timeState, mapProvider._map));
        }, this);
        this.isLoading = true;
        $q.all(promises).then(function () {
          this.isLoading = false;
          defer.resolve();
        });
        return defer.promise;
      },

      // Options contains geom, time and [event, timeseries, rain, waterchain]
      getData: function (options) {
        var defer = $q.defer();
        var promises = [];
        angular.forEach(this.layerGroups, function (layerGroup) {
          promises.push(
            layerGroup.getData(options).then(null, null, function (response) {
              defer.notify(response);
            }));
        }, this);
        this.isLoading = true;
        $q.all(promises).then(function () {
          this.isLoading = false;
          defer.resolve();
        });
        return defer.promise;
      },

      /**
       * @function
       * @memberOf app.NxtMap
       * @description Sets the layergroups to the state they came from the
       *              server. Is called by the urlCtrl when no layergroup
       *              info is found on the server
       */
      setLayerGoupsToDefault: function () {
        angular.forEach(this.layerGroups, function (layerGroup) {
          if (layerGroup.defaultActive && !layerGroup.isActive()) {
            this.toggleLayerGroup(layerGroup);
          } else if (!layerGroup.defaultActive && layerGroup.isActive()) {
            this.toggleLayerGroup(layerGroup);
          }
        });
      }
    };

    /**
     * @function
     * @memberof app.NxtMapService
     * @param  {object} nonLeafLayer object from database
     * @description Throw in a layer as served from the backend
     */
    var createLayerGroups = function (serverSideLayerGroups) {
      var layerGroups = {};
      angular.forEach(serverSideLayerGroups, function (sslg) {
        layerGroups[sslg.slug] = new LayerGroup(sslg);
      });
      return layerGroups;
    };

    return NxtData;

  }]);