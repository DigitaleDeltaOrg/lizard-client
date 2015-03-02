
angular.module('time-ctx')
  .directive('timeCtx',
             ["EventAggregateService", "State", "DataService", "UtilService", "Timeline",
              function (EventAggregateService, State, DataService, UtilService, Timeline) {

  var link = function (scope, element, attrs) {

    var TL_TOP_MARGIN = 10,
        GRAPH_PADDING = 5,
        nGraphs = 1;


    var getWidth = function () {
      return element.find('.dashboard-inner').width();
    };


    var getHeight = function () {
      return element.height() - 50; // min-height from top row
    };

    Timeline.onresize = function (dimensions) {
      nGraphs = Object.keys(scope.tctx.content).length;

      scope.tctx.dims.height = (getHeight() - dimensions.height - TL_TOP_MARGIN) / nGraphs  - GRAPH_PADDING;
    };

    scope.tctx.dims = {
      width: UtilService.getCurrentWidth() + UtilService.TIMELINE_LEFT_MARGIN,
      height: getHeight() / nGraphs,
      padding: {
        top: GRAPH_PADDING,
        right: 0,
        bottom: 0,
        left: UtilService.TIMELINE_LEFT_MARGIN
      }
    };

    scope.tctx.content = [];

    for (var i = 15 - 1; i >= 0; i--) {
      scope.tctx.content[i] = {
        data: []
      };
      scope.tctx.content[i].data = [[2, 0], [0, 1], [4, 3], [7, 0], [8, 1], [9, 3], [10, 0], [11, 1], [15, 3]];
    }



    // var aggregateEvents = function () {
    //   var eventAgg;
    //   // reset eventAggs
    //   scope.eventAggs = [];
    //   angular.forEach(DataService.layerGroups, function (lg) {
    //     lg.getData({
    //       geom: State.spatial.bounds,
    //       start: State.temporal.start,
    //       end: State.temporal.end,
    //       type: 'Event'
    //     }).then(null, null, function (response) {

    //       if (response && response.data) {
    //         // aggregate response
    //         eventAgg = {
    //           data: EventAggregateService.aggregate(
    //                   response.data,
    //                   State.temporal.aggWindow,
    //                   lg.mapLayers[0].color
    //                 ),
    //           ylabel: lg.name,
    //           baseColor: lg.mapLayers[0].color
    //         };

    //         scope.eventAggs.push(eventAgg);
    //         // calculate new dimensions
    //         scope.dimensions.height =
    //           (getHeight() / scope.eventAggs.length) - 20;
    //       }
    //     });
    //   });
    // };

    /**
     * Updates time-ctx when time zoom changes.
     */
    scope.$watch(State.toString('temporal.timelineMoving'), function (n, o) {
      if (n === o) { return true; }
      // aggregateEvents();
    });

    // init
    // aggregateEvents();

    // hack to get color map for legend
    // scope.getColorMap = EventAggregateService.getColorMap;
  };

  return {
    link: link,
    templateUrl: 'time-ctx/time-ctx.html',
    replace: true,
    restrict: 'E'
  };

}]);
