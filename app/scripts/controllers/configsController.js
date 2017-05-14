class ConfigsCtrl {
  constructor($scope, ConfigEditorProxy, whenMqttReady, errors) {
    'ngInject';

    $scope.configs = [];
    whenMqttReady().then(() => ConfigEditorProxy.List()).then(result => {
      $scope.configs = result;
      console.log("result",result);

    }).catch(errors.catch("Error listing the configs"));
  }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.configs', [])
    .controller('ConfigsCtrl', ConfigsCtrl);
