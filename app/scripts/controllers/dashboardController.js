class DashboardCtrl {
    constructor($scope, uiConfig, $stateParams, rolesFactory) {
        'ngInject';

        $scope.roles = rolesFactory;

        $scope.svgDownloadUrl = null;
        $scope.svgDownloadName = null;

        var defaultDashboard = {};

        function getDashboard() {
            return uiConfig.getDashboard($stateParams.id);
        }

        uiConfig.whenReady().then(() => {
            $scope.$watch(getDashboard, newDashboard => {
                $scope.dashboard = newDashboard;
 
                if ($scope.dashboard.content.isSvg && $scope.dashboard.content.svg_url) {
                    $scope.svgDownloadUrl = $scope.dashboard.content.svg_url;
                    console.log($scope.svgDownloadUrl);
                    $scope.svgDownloadName = $scope.dashboard.id + '.svg';
                }
            });
        });

        $scope.addWidget = () => {
            $scope.dashboard.widgets.push(uiConfig.addWidget());
        };

        $scope.removeWidget = (widget) => {
            if (confirm("Really delete widget from dashboard?"))
                $scope.dashboard.removeWidgetFromDashboard(widget);
        };

        $scope.deleteWidget = (widget) => {
            if (confirm("Really delete the widget?"))
                uiConfig.deleteWidget(widget);
        };

    }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.dashboard', [])
    .controller('DashboardCtrl', DashboardCtrl);
