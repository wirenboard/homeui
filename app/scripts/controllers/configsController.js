class ConfigsCtrl {
  constructor($scope, ConfigEditorProxy, whenMqttReady, errors, rolesFactory, $locale) {
    'ngInject';

    this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_THREE);
    if(!this.haveRights) return;
    $scope.configs = [];
    $scope.$locale = $locale;
    whenMqttReady().then(() => ConfigEditorProxy.List()).then(result => {
      $scope.configs = result;
      $scope.configs.sort((a, b) => {
        const aTitle = (a.titleTranslations && a.titleTranslations[$locale.id]) || a.title;
        const bTitle = (b.titleTranslations && b.titleTranslations[$locale.id]) || b.title;
        return aTitle.localeCompare(bTitle);
      })

    }).catch(errors.catch("Error listing the configs"));
  }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.configs', [])
    .controller('ConfigsCtrl', ConfigsCtrl);
