import dashboardListDirective from '~/react-directives/dashboard-list/dashboardListDirective';

export default angular
  .module('homeuiApp.dashboard', [])
  .directive('dashboardsPage', ['ConfigEditorProxy', 'uiConfig', 'rolesFactory', dashboardListDirective]);
