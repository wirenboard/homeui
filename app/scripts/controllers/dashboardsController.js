class DashboardsCtrl {
  constructor($scope, uiConfig) {
    'ngInject';

    // FIXME: make better use of the model
    $scope.data = uiConfig.data;

    $scope.model = (dashboard) => uiConfig.getDashboard(dashboard.id);

    $scope.addDashboard = () => uiConfig.addDashboard();

    $scope.checkNonEmpty = function (value, msg) {
      if (!/\S/.test(value))
        return msg;
      return true;
    };

    $scope.checkId = function (value, dashboard) {
      var r = this.checkNonEmpty(value, "Empty dashboard id is not allowed");
      if (r !== true)
        return r;
      value = value.replace(/^\s+|\s+$/g, "");
      return $scope.data.dashboards.some(function (otherDashboard) {
        return otherDashboard !== dashboard && otherDashboard.id == value;
      }) ? "Duplicate dashboard ids are not allowed" : true;
    };

    $scope.cancel = (dashboard) => {
      if (dashboard.isNew)
        $scope.model(dashboard).remove();
    };

    $scope.afterSave = (dashboard) => {
      delete dashboard.isNew;
    };
    // TBD: add uiconfig methods to save/revert dashboards
  }
}

export default DashboardsCtrl;
