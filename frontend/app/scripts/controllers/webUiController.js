import { setReactLocale } from '../react-directives/locale';

class WebUICtrl {
  constructor(uiConfig, errors, rolesFactory, $window, $translate, tmhDynamicLocale) {
    'ngInject';

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

    this.changeLanguage = () => {
      $translate.use(this.language);
      tmhDynamicLocale.set(this.language);
      localStorage.setItem('language', this.language);
      setReactLocale();
    };

    this.setShowSystemDevices = () => {
      $window.localStorage.setItem('show-system-devices', this.showSystemDevices);
    };

    this.showMqttConfig = () => {
      return rolesFactory.notConfiguredAdmin;
    }
  }

  changeDefaultDashboard() {
    let id = this.defaultDashboardId ? this.defaultDashboardId : '';
    this.uiConfig.setDefaultDashboard(id);
  }
}

export default angular
  .module('homeuiApp.webui', [])
  .controller('WebUICtrl', WebUICtrl);
