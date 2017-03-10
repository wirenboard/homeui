class DashboardCtrl {
  constructor($scope, uiConfig, $stateParams) {
    'ngInject';

    var defaultDashboard = {};
    function getDashboard () {
      return uiConfig.getDashboard($stateParams.id);
    }

    uiConfig.whenReady().then(() => {
      $scope.$watch(getDashboard, newDashboard => {
        $scope.dashboard = newDashboard;
      });

      $scope.addWidget = () => {
        $scope.dashboard.widgets.push(uiConfig.addWidget());
      };

      $scope.removeWidget = (widget) => {
        $scope.dashboard.removeWidgetFromDashboard(widget);
      };

      $scope.deleteWidget = (widget) => {
        uiConfig.deleteWidget(widget);
      };
    });
  }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.dashboard', [])
    .controller('DashboardCtrl', DashboardCtrl);
