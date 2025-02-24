import ruleDirective from '~/react-directives/rule/rule';

export default angular
  .module('homeuiApp.rule', [])
  .directive('rulePage', ['whenMqttReady', 'EditorProxy', 'rolesFactory', ruleDirective]);
