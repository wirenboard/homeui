"use strict";

angular.module("homeuiApp")
  .controller("WidgetsCtrl", function ($scope, uiConfig, DeviceData) {
    $scope.cell = id => {
      return DeviceData.proxy(id);
    };
    function wrapWidgetCell (entry) {
      var proxy = DeviceData.proxy(entry.id);
      return {
        id: entry.id,
        get name() {
          return (entry.hasOwnProperty("name") && entry.name) || proxy.name;
        },
        proxy: proxy
      };
    }

    $scope.historyStartTS = () => {
      var t = new Date().getTime();
      return t - t % 86400000;
    };
    $scope.rows = [];
    $scope.$watch(uiConfig.version, () => {
      var dashboardMap = Object.create(null);
      uiConfig.data.dashboards.forEach(dashboard => {
        dashboard.widgets.forEach(widgetId => {
          (dashboardMap[widgetId] || (dashboardMap[widgetId] = [])).push(uiConfig.getDashboard(dashboard.id));
        });
      });
      // XXX: dashboards. perhaps should add config change tracking
      $scope.rows = Array.prototype.concat.apply([], uiConfig.data.widgets.map(widget => [
        {
          name: widget.name,
          id: widget.id,
          widget: widget,
          rowSpan: Math.max(widget.cells.length, 1),
          dashboards: dashboardMap[widget.id] || [],
          cellIndex: 1,
          cell: widget.cells.length ? wrapWidgetCell(widget.cells[0]) : null,
          deleteWidget: () => {
            uiConfig.deleteWidget(widget);
          }
        }
      ].concat(widget.cells.slice(1).map((cell, n) => ({
        name: widget.name,
        id: widget.id,
        widget: null,
        cellIndex: n + 2,
        cell: wrapWidgetCell(cell)
      })))));
    });
  });
