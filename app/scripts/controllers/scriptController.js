import scriptEditorDirective from '../react-directives/script-editor/script-editor';

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
export default angular
  .module('homeuiApp.script', [])
  .controller('ScriptCtrl', ScriptCtrl)
  .directive('scriptEditorPage', scriptEditorDirective);
