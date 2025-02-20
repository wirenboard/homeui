'use strict';

import { setReactLocale } from '../react-directives/locale';
import viewSvgDashboardDirective from '../react-directives/view-svg-dashboard/view-svg-dashboard';

class DashboardSvgController {
  constructor($scope, $stateParams, rolesFactory, $state) {
    'ngInject';

    setReactLocale();

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

export default angular
  .module('homeuiApp.dashboardsvg', [])
  .controller('DashboardSvgCtrl', DashboardSvgController)
  .directive('viewSvgDashboardPage', viewSvgDashboardDirective);
