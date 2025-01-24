class ConfigsCtrl {
  constructor($scope, ConfigEditorProxy, whenMqttReady, errors, rolesFactory, $locale) {
    'ngInject';

    $scope.configs = [];
    $scope.$locale = $locale;

    rolesFactory.asyncCheckRights(rolesFactory.ROLE_THREE, () => {
      this.haveRights = true;
      whenMqttReady()
        .then(() => ConfigEditorProxy.List())
        .then(result => {
          $scope.configs = result;
        })
        .catch(errors.catch('Error listing the configs'));
    });
  }
}

//-----------------------------------------------------------------------------
export default angular.module('homeuiApp.configs', []).controller('ConfigsCtrl', ConfigsCtrl);
