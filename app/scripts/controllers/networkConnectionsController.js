import networkConnectionsDirective from '../react-directives/network-connections/network-connections';

class NetworkConnectionsCtrl {
  constructor($scope, $stateParams, rolesFactory) {
    'ngInject';

    this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_THREE);
    if (!this.haveRights) return;
    $scope.file = {
      schemaPath: $stateParams.path,
    };

    if (!/^\//.test($scope.file.schemaPath)) $scope.file.schemaPath = '/' + $scope.file.schemaPath;
  }
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.config', [])
  .controller('NetworkConnectionsCtrl', NetworkConnectionsCtrl)
  .directive('networkConnectionsPage', networkConnectionsDirective);
