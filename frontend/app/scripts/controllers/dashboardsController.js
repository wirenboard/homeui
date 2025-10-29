import dashboardListDirective from '~/react-directives/dashboard-list/dashboardListDirective';

export default angular
  .module('homeuiApp.dashboard', [])
  .directive('dashboardsPage', ['$rootScope', 'rolesFactory', dashboardListDirective]);
