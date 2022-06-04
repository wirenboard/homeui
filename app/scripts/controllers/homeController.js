class HomeCtrl {
  constructor($state, uiConfig,rolesFactory) {
    'ngInject';

    this.roles = rolesFactory;
    uiConfig.whenReady()
    .then((data) => {
      if (data.defaultDashboardId) {
        $state.go('dashboard', {id: data.defaultDashboardId});
      }
    });
  }
}

export default HomeCtrl;
