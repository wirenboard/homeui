'use strict';

import svgViewComponent from '../components/svgEditor/view/svgView.component';
import svgViewElementDirective from '../components/svgEditor/directives/svgViewElement';

class DashboardSvgController {
    constructor($scope, uiConfig, $stateParams, rolesFactory) {
        'ngInject';

        $scope.roles = rolesFactory;
        $scope.svgDownloadUrl = null;
        $scope.svgDownloadName = null;

        $scope.urlData = null;

        function getDashboard() {
            return uiConfig.getDashboard($stateParams.id);
        }

        uiConfig.whenReady().then(() => {
            $scope.$watch(getDashboard, newDashboard => {
                $scope.dashboard = newDashboard;

                if ($scope.dashboard.content.isSvg && $scope.dashboard.content.svg.current.length) {
                    var blob = new Blob([$scope.dashboard.content.svg.current], { type : 'image/svg+xml' });
                    $scope.svgDownloadUrl = (window.URL || window.webkitURL).createObjectURL(blob);
                    $scope.svgDownloadName = $scope.dashboard.id + '.svg';
                }
            });
        });
    }
}

export default angular
    .module('homeuiApp.dashboard-svg', [])
    .component('svgView', svgViewComponent)
    .directive('svgViewElement', svgViewElementDirective)
    .controller('DashboardSvgCtrl', DashboardSvgController);