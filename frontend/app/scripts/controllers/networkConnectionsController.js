import networkConnectionsDirective from '../react-directives/network-connections/network-connections';

class NetworkConnectionsCtrl {
  constructor($scope, $stateParams, rolesFactory) {
    'ngInject';

    this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_THREE);
    if (!this.haveRights) return;
  }
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.config', [])
  .controller('NetworkConnectionsCtrl', NetworkConnectionsCtrl)
  .directive('networkConnectionsPage', networkConnectionsDirective);
