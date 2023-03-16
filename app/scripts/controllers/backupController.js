class BackupCtrl {
  constructor($scope) {
    'ngInject';

    $scope.btnVisible = true;
    $scope.btnEnabled = true;
    $scope.text = "Download rootfs archive";

    var downloadRootfs = function () {
      window.location.href = 'fwupdate/download/rootfs';
    };

    $scope.btnMethod = downloadRootfs;
  }
}

export default BackupCtrl;
