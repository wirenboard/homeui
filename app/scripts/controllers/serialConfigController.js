class SerialConfigCtrl {
  constructor($scope, $stateParams) {
    'ngInject';
    $scope.devices = $stateParams.devices;
  }
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.config', [])
  .controller('SerialConfigCtrl', SerialConfigCtrl);
