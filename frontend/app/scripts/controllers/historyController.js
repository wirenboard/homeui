import historyDirective from '~/react-directives/history/historyDirective';

export default angular
  .module('homeuiApp.history', [])
  .directive('historyPage', historyDirective);
