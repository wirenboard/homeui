import rulesDirective from '~/react-directives/rules/rules';

export default angular
  .module('homeuiApp.rule', [])
  .directive('rulesPage', ['whenMqttReady', 'EditorProxy', 'rolesFactory', rulesDirective]);
