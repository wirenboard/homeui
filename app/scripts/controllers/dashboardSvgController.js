'use strict';

class DashboardSvgController {
    constructor($scope, $stateParams, rolesFactory) {
        'ngInject';

        $scope.roles = rolesFactory;
        $scope.id = $stateParams.id;
    }
}

export default DashboardSvgController;