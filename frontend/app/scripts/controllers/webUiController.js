import webUiSettingsDirective from '~/react-directives/web-ui-settings/webUiSettingsDirective';

export default angular
  .module('homeuiApp.webui', [])
  .directive('webUiSettingsPage', [
    'ConfigEditorProxy',
    'rolesFactory',
    '$translate',
    'tmhDynamicLocale',
    'uiConfig',
    webUiSettingsDirective
  ]);
