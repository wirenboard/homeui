'use strict';

class DashboardSvgController {
  constructor($scope, $stateParams, rolesFactory, $state) {
    'ngInject';

    this.$state = $state;
    $scope.roles = rolesFactory;
    $scope.id = $stateParams.id;
  }

  uiOnParamsChanged(changedParams, transition) {
    if (!transition.options()?.custom?.noreload) {
      this.$state.reload();
    }
  }
}

export default DashboardSvgController;
