class ConfigCtrl {
  constructor(
    $scope,
    $stateParams,
    rolesFactory,
    ConfigEditorProxy,
    whenMqttReady,
    PageState,
    errors,
    $state
  ) {
    'ngInject';

    this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_THREE);
    if (!this.haveRights) return;
    $scope.file = {
      schemaPath: $stateParams.path,
      configPath: '',
      loaded: false,
      valid: true,
      content: {},
      schema: undefined,
    };

    if (!/^\//.test($scope.file.schemaPath)) $scope.file.schemaPath = '/' + $scope.file.schemaPath;

    $scope.canSave = function () {
      return PageState.isDirty() && $scope.file.valid;
    };

    $scope.onChange = function (content, errors) {
      if (!angular.equals($scope.file.content, content)) {
        PageState.setDirty(true);
        $scope.file.content = content;
      }
      $scope.file.valid = !errors.length;
    };

    var load = function () {
      ConfigEditorProxy.Load({ path: $scope.file.schemaPath })
        .then(function (r) {
          if (r.editor) {
            $state.go(r.editor, { path: $stateParams.path });
            return;
          }
          $scope.file.configPath = r.configPath;
          $scope.file.content = r.content;
          $scope.file.schema = r.schema;
          $scope.file.loaded = true;
        })
        .catch(errors.catch('configurations.errors.load'));
    };

    $scope.save = function () {
      PageState.setDirty(false);
      ConfigEditorProxy.Save({ path: $scope.file.schemaPath, content: $scope.file.content })
        .then(function () {
          $scope.file.content = angular.merge({}, $scope.file.content);
          if ($scope.file.schema.needReload) load();
        })
        .catch(function (e) {
          PageState.setDirty(true);
          errors.showError(
            { msg: 'configuration.errors.save', data: { name: $scope.file.configPath } },
            e
          );
        });
    };

    whenMqttReady().then(load);
  }
}

//-----------------------------------------------------------------------------
export default angular.module('homeuiApp.config', []).controller('ConfigCtrl', ConfigCtrl);
