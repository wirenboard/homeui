import dashboardDirective from '~/react-directives/dashboard/dashboardDirective';

export default angular
  .module('homeuiApp.dashboard', [])
  .directive('dashboardPage', ['$rootScope', '$stateParams', 'mqttClient', 'rolesFactory', dashboardDirective]);
