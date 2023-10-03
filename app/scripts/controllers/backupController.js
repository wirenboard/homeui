class BackupCtrl {
  constructor($scope) {
    'ngInject';

    $scope.btnEnabled = true;

    var downloadRootfs = function () {
      $scope.btnEnabled = false;
    };

    $scope.btnMethod = downloadRootfs;
  }
}

export default BackupCtrl;
