class WidgetsCtrl {
  constructor($scope, uiConfig, DeviceData, getTime) {
    'ngInject';
    console.log('WidgetsCtrl constructor call.');

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
      var t = getTime(),
          d = new Date();
      d.setTime(t);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
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
      $scope.rows = Array.prototype.concat.apply([], uiConfig.data.widgets.map(widget => {
        var primaryRow = {
          name: widget.name,
          id: widget.id,
          widget: widget,
          get rowSpan () {
            return this.preview ? 1 : Math.max(widget.cells.length, 1);
          },
          dashboards: dashboardMap[widget.id] || [],
          cellIndex: 1,
          cell: widget.cells.length ? wrapWidgetCell(widget.cells[0]) : null,
          show: true,
          preview: false,
          deleteWidget: () => {
            if (confirm("Really delete the widget?"))
              uiConfig.deleteWidget(widget);
          }
        };
        return [ primaryRow ].concat(widget.cells.slice(1).map((cell, n) => ({
          name: widget.name,
          id: widget.id,
          widget: null,
          cellIndex: n + 2,
          cell: wrapWidgetCell(cell),
          get show () { return !primaryRow.preview; },
          get preview () { return primaryRow.preview; }
        })));
      }));
    });
  }
}

export default WidgetsCtrl;
