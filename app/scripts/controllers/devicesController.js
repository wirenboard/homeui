import devicesDirective from '~/react-directives/devices/devicesDirective';

export default angular
  .module('homeuiApp.devices', [])
  .directive('devicesPage', ['mqttClient', 'rolesFactory', devicesDirective]);
