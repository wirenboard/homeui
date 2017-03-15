class SettingCtrl {
//.............................................................................
  constructor(uiConfig, errors) {
    'ngInject';

    this.uiConfig = uiConfig;

    this.settings = {
      // setting0: { name: "IP", value: "148.251.208.199" },
      // setting4: { name: "Mosquitto Version", value: "1.4" },
      // setting5: { name: "Webfsd Version", value: "1.21" },
      // setting6: { name: "Controller Serial Nubmer", value: "199-251-148-208" },
      // setting7: { name: "Controller Version", value: "1.34" },
      // setting8: { name: "Debian Version", value: "7.8" }
    };

    uiConfig.whenReady()
    .then((data) => {
      this.dashboards = data.dashboards;
      this.widgets = data.widgets;
      this.defaultDashboard = uiConfig.getDashboard(data.defaultDashboardId);
    })
    .catch(errors.catch('Error loading WebUI config'));
  }

//.............................................................................
  changeDefaultDashboard() {
    let id = this.defaultDashboard ? this.defaultDashboard.id : '';
    this.uiConfig.setDefaultDashboard(id);
  };
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.settings', [])
    .controller('SettingCtrl', SettingCtrl);
