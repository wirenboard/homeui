class ScriptsCtrl {
  constructor($scope, EditorProxy, whenMqttReady, errors) {
    'ngInject';
    console.log('ScriptsCtrl constructor call.');

    $scope.scripts = [];
    whenMqttReady().then(function () {
      return EditorProxy.List();
    }).then(function (result) {
      $scope.scripts = result;
    }).catch(errors.catch("Error listing the scripts"));
  }
}

export default ScriptsCtrl;
