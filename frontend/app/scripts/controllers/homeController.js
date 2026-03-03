import { reaction } from 'mobx';

export default class HomeCtrl {
  constructor($state, $rootScope, rolesFactory) {
    'ngInject';
    this.roles = rolesFactory;

    reaction(() => $rootScope.dashboardsStore.isLoading, () => {
      const { defaultDashboardId, dashboards } = $rootScope.dashboardsStore
      if (defaultDashboardId && dashboards.get(defaultDashboardId)) {
        const dashboard = dashboards.get(defaultDashboardId);
        if (dashboard.isSvg) {
          $state.go('dashboard-svg', { id: defaultDashboardId });
        } else {
          $state.go('dashboard', { id: defaultDashboardId});
        }
      } else {
        $state.go('dashboards');
      }
    });
  }
}
