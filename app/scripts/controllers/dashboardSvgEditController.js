'use strict';

class DashboardSvgEditController {
    constructor($scope, uiConfig, $stateParams, rolesFactory) {
        'ngInject';
        $scope.roles = rolesFactory;

        var vm = this;
    
        function getDashboard() {
            if ($stateParams.id) {
                return uiConfig.getDashboard($stateParams.id);
            }
            return uiConfig.addDashboardWithSvg();
        }
    
        uiConfig.whenReady().then(() => {
            vm.dashboard = getDashboard();
        });
    }
}

export default angular
    .module('homeuiApp.dashboard-svg-edit', [])
    .controller('DashboardSvgEditCtrl', DashboardSvgEditController);
