class ScriptCtrl {
  constructor($scope, $stateParams) {
    'ngInject';

    $scope.canSave = function () {
      return PageState.isDirty() || $scope.file.isNew;
    };
    $scope.file = {
      path: $stateParams.path,
    };
  }
}

//-----------------------------------------------------------------------------
export default ScriptCtrl;
