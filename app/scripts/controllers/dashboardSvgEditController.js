'use strict';

class DashboardSvgEditController {
    constructor($scope, $stateParams, rolesFactory) {
        'ngInject';
        
        $scope.roles = rolesFactory;
        $scope.id = $stateParams.id;
    }
}

export default angular
    .module('homeuiApp.dashboard-svg-edit', [])
    .controller('DashboardSvgEditCtrl', DashboardSvgEditController);
