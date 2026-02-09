class HomeCtrl {
  constructor($state, uiConfig, rolesFactory) {
    'ngInject';

    this.roles = rolesFactory;
    uiConfig.whenReady().then(data => {
      if (data.defaultDashboardId && data.dashboards.find(item => item.id === data.defaultDashboardId)) {
        var dashboard = uiConfig.getDashboard(data.defaultDashboardId);
        if (dashboard.content.isSvg) {
          $state.go('dashboard-svg', { id: data.defaultDashboardId });
        } else {
          $state.go('dashboard', { id: data.defaultDashboardId });
        }
      } else {
        $state.go('dashboards');
      }
    });
  }
}

export default HomeCtrl;
