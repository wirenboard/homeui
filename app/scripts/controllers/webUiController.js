class WebUICtrl {
  constructor(uiConfig, errors, rolesFactory, $window) {
    'ngInject';

    this.rolesFactory = rolesFactory;
    this.uiConfig = uiConfig;
    this.language = $window.localStorage['language'];
    this.showSystemDevices = $window.localStorage['show-system-devices'] || 'no';

    uiConfig
      .whenReady()
      .then(data => {
        this.dashboards = data.dashboards;
        this.widgets = data.widgets;
        this.defaultDashboardId = data.defaultDashboardId;
      })
      .catch(errors.catch('Error loading WebUI config'));

    this.setShowSystemDevices = () => {
      $window.localStorage.setItem('show-system-devices', this.showSystemDevices);
    };
  }

  changeDefaultDashboard() {
    let id = this.defaultDashboardId ? this.defaultDashboardId : '';
    this.uiConfig.setDefaultDashboard(id);
  }
}

export default angular
  .module('homeuiApp.webui', [])
  .controller('WebUICtrl', WebUICtrl);
