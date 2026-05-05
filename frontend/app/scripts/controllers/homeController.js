import { when } from 'mobx';

export default class HomeCtrl {
  constructor($state, $rootScope, rolesFactory) {
    'ngInject';
    this.roles = rolesFactory;

    const store = $rootScope.dashboardsStore;

    const redirect = () => {
      const { defaultDashboardId, dashboards } = store;

      if (defaultDashboardId && dashboards.get(defaultDashboardId)) {
        const dashboard = dashboards.get(defaultDashboardId);

        $state.go(
          dashboard.isSvg ? 'dashboard-svg' : 'dashboard',
          { id: defaultDashboardId }
        );
      } else {
        $state.go('dashboards');
      }
    };

    if (!store.isLoading) {
      redirect();
    } else {
      when(
        () => !store.isLoading,
        redirect
      );
    }
  }
}
