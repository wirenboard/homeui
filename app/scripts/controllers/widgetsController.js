class WidgetsCtrl {
  constructor($scope, $state, uiConfig, DeviceData, handleData, rolesFactory, historyUrlService) {
    'ngInject';

    
    this.handleData = handleData;
    this.cell = id => {
      return DeviceData.proxy(id);
    };
    function wrapWidgetCell (entry) {
      var proxy = DeviceData.proxy(entry.id);
      var splittedId = entry.id.split('/', 2);
      return {
        id: entry.id,
        extra: entry.extra,
        device: splittedId[0],
        control: splittedId[1],
        get name() {
          return (entry.hasOwnProperty("name") && entry.name) || proxy.name;
        },
        proxy: proxy
      };
    }
    
    $scope.roles = rolesFactory;
    $scope.rows = [];
    $scope.goToHistory = (cell) => {
      const data = historyUrlService.encodeControl(cell.device, cell.control, handleData.historyStartTS());
      $state.go('history.sample', { data })
    }
    $scope.$watch(uiConfig.version, () => {
      var dashboardMap = Object.create(null);
      var dashboards = uiConfig.data.dashboards;
      dashboards.forEach(dashboard => {
        dashboard.widgets.forEach(widgetId => {
          (dashboardMap[widgetId] || (dashboardMap[widgetId] = [])).push(uiConfig.getDashboard(dashboard.id));
        });
      });
      // XXX: dashboards. perhaps should add config change tracking
      $scope.rows = Array.prototype.concat.apply([], uiConfig.data.widgets.map((widget,i) => {
        var primaryRow = {
          name: widget.name,
          id: widget.id,
          _id:i+1,
          widget: widget,
          get rowSpan () {
            return this.preview ? 1 : Math.max(widget.cells.length, 1);
          },
          dashboards: dashboardMap[widget.id] || [],
          availableDashboards: dashboards.filter(d => !(dashboardMap[widget.id] || []).some(dm => d.id === dm.id) && !d.isSvg),
          cellIndex: 1,
          cell: widget.cells.length ? wrapWidgetCell(widget.cells[0]) : null,
          show: true,
          preview: false,
          addDashboard: (dashboard) => {
            dashboard.widgets.push(widget.id);
          },
          deleteWidget: () => {
            if (confirm("Really delete the widget?"))
              uiConfig.deleteWidget(widget);
          }
        };
        return [ primaryRow ].concat(widget.cells.slice(1).map((cell, n) => ({
          name: widget.name,
          id: widget.id,
          _id: widget.id.slice(6),
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

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.widgets', [])
    .controller('WidgetsCtrl', WidgetsCtrl);
