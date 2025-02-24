import rulesDirective from '~/react-directives/rules/rules';

export default angular
  .module('homeuiApp.rules', [])
  .directive('rulesPage', ['whenMqttReady', 'EditorProxy', 'rolesFactory', rulesDirective]);
