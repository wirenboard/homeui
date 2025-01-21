import networkConnectionsDirective from '../react-directives/network-connections/network-connections';

class NetworkConnectionsCtrl {
  constructor($scope, $stateParams, rolesFactory) {
    'ngInject';

    rolesFactory.asyncCheckRights(rolesFactory.ROLE_THREE, () => {
      this.haveRights = true;
      $scope.file = {
        schemaPath: $stateParams.path,
      };

      if (!/^\//.test($scope.file.schemaPath))
        $scope.file.schemaPath = '/' + $scope.file.schemaPath;
    });
  }
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.config', [])
  .controller('NetworkConnectionsCtrl', NetworkConnectionsCtrl)
  .directive('networkConnectionsPage', networkConnectionsDirective);
