'use strict';

import editSvgDashboardDirective from '../react-directives/edit-svg-dashboard/edit-svg-dashboard';

class DashboardSvgEditController {
  constructor($scope, $stateParams, rolesFactory) {
    'ngInject';

    $scope.roles = rolesFactory;
    $scope.id = $stateParams.id;
  }
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.dashboardSvgEdit', [])
  .controller('DashboardSvgEditCtrl', DashboardSvgEditController)
  .directive('editSvgDashboardPage', editSvgDashboardDirective);

