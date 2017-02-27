class ConfigsCtrl {
  constructor($scope, ConfigEditorProxy, whenMqttReady, errors) {
    'ngInject';
    console.log('ConfigsCtrl constructor call.');

    $scope.configs = [];
    whenMqttReady().then(() => ConfigEditorProxy.List()).then(result => {
      $scope.configs = result;
    }).catch(errors.catch("Error listing the configs"));
  }
}

export default ConfigsCtrl;
