'use strict';

class DashboardsCtrl {
  constructor($scope, $translate, uiConfig, rolesFactory, $rootScope) {
    'ngInject';

    this.$translate = $translate;
    this.roles = rolesFactory;
    this.uiConfig = uiConfig;
    this.data = uiConfig.data;
    this.updateTranslations();

    const disposeTranslations = $rootScope.$on('$translateChangeSuccess', () => this.updateTranslations());

    $scope.cancel = dashboard => {
      if (dashboard.isNew) {
        uiConfig.getDashboard(dashboard.id).remove();
      }
    };

    $scope.$on('$destroy', () => {
      disposeTranslations();
    });
  }

  //.............................................................................
  updateTranslations() {
    this.$translate([
      'dashboards.error.duplicate',
      'dashboards.error.emptyId',
      'dashboards.error.emptyName',
    ]).then(translations => {
      this.duplicateDashboardErrorMsg = translations['dashboards.error.duplicate'];
      this.emptyIdErrorMsg = translations['dashboards.error.emptyId'];
      this.emptyNameErrorMsg = translations['dashboards.error.emptyName'];
    });
  }

  //.............................................................................
  addDashboard() {
    this.uiConfig.addDashboard();
  }

  addDashboardWithSvg() {
    this.uiConfig.addDashboardWithSvg();
  }

  deleteDashboard(dashbrd) {
    this.data.dashboards = this.data.dashboards.filter(
      dashboard => !(dashboard.name === dashbrd.name && dashboard.id === dashbrd.id)
    );
  }

  //.............................................................................
  checkNonEmpty(value, msg) {
    if (!/\S/.test(value)) {
      return msg;
    }
    return true;
  }

  //.............................................................................
  checkName(name) {
    return this.checkNonEmpty(name, this.emptyNameErrorMsg);
  }

  //.............................................................................
  checkId(value, dashboard) {
    var r = this.checkNonEmpty(value, this.emptyIdErrorMsg);
    if (r !== true) {
      return r;
    }
    value = value.replace(/^\s+|\s+$/g, '');
    return this.data.dashboards.some(function (otherDashboard) {
      return otherDashboard !== dashboard && otherDashboard.id == value;
    })
      ? this.duplicateDashboardErrorMsg
      : true;
  }

  //.............................................................................
  afterSave(dashboard) {
    delete dashboard.isNew;
  }
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.dashboards', [])
  .controller('DashboardsCtrl', DashboardsCtrl);
