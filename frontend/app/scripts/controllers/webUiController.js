import webUiSettingsDirective from '~/react-directives/web-ui-settings/webUiSettingsDirective';

export default angular
  .module('homeuiApp.webui', [])
  .directive('webUiSettingsPage',  webUiSettingsDirective);
