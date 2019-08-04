'use strict';

import svgViewComponent from '../components/svgEditor/view/svgView.component';
import svgViewElementDirective from '../components/svgEditor/directives/svgViewElement';

class DashboardSvgController {
    constructor($scope, uiConfig, $stateParams, rolesFactory) {
        'ngInject';
        $scope.roles = rolesFactory;

        var vm = this;
    
        function getDashboard() {
            return uiConfig.getDashboard($stateParams.id);
        }

        uiConfig.whenReady().then(() => {
            $scope.$watch(getDashboard, newDashboard => {
                $scope.dashboard = newDashboard;
            });
        });
    }
}

export default angular
    .module('homeuiApp.dashboard-svg', [])
    .component('svgView', svgViewComponent)
    .directive('svgViewElement', svgViewElementDirective)
    .controller('DashboardSvgCtrl', DashboardSvgController);