class DashboardCtrl {
  constructor($scope, uiConfig, $stateParams, rolesFactory, $transition$, $state, $rootScope) {
    'ngInject';

    $scope.roles = rolesFactory;

    $scope.svgDownloadUrl = null;
    $scope.svgDownloadName = null;

    $scope.sourceDashboardId = $transition$.options()?.custom?.source;

    function getDashboard() {
      return uiConfig.getDashboard($stateParams.id);
    }

    uiConfig.whenReady().then(() => {
      $scope.$watch(getDashboard, newDashboard => {
        $scope.dashboard = newDashboard;

        if ($scope.dashboard.content.isSvg && $scope.dashboard.content.svg_url) {
          let url = $scope.dashboard.content.svg_url;
          var fileName = url.substring(url.lastIndexOf('/') + 1);
          $scope.svgDownloadUrl = url;
          $scope.svgDownloadName = fileName;
        }
      });
    });

    $scope.addWidget = () => {
      $scope.dashboard.widgets.push(uiConfig.addWidget());
    };

    $scope.removeWidget = widget => $scope.dashboard.removeWidgetFromDashboard(widget);
    $scope.deleteWidget = widget => uiConfig.deleteWidget(widget);
    $scope.back = () => {
      let params = {
        id: $scope.sourceDashboardId,
      };
      if ($rootScope.forceFullscreen) {
        params.fullscreen = $rootScope.forceFullscreen;
      }
      if ($rootScope.isHMI) {
        params.hmi = $rootScope.isHMI;
      }
      if ($rootScope.hmiColor) {
        params.hmicolor = $rootScope.hmiColor;
      }
      $state.go('dashboard-svg', params);
    };
  }
}

//-----------------------------------------------------------------------------
export default angular.module('homeuiApp.dashboard', []).controller('DashboardCtrl', DashboardCtrl);
