class FactoryResetCtrl {
  constructor($scope) {
    'ngInject';

    $scope.btnEnabled = true;

    var factoryReset = function () {
      $scope.btnEnabled = false;
    };

    $scope.btnMethod = factoryReset;
  }
}

export default FactoryResetCtrl;
