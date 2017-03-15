class HomeCtrl {
  constructor(uiConfig) {
    'ngInject';

    uiConfig.whenReady()
    .then((data) => {
      this.dashboard = uiConfig.getDashboard(data.defaultDashboardId);
    });
  }
}

export default HomeCtrl;
