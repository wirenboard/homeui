import controller from './svgForm.controller';
import template from './svgForm.html';

export default {
  restrict: 'E',
  scope: true,
  bindings: {
    dashboard: '=',
  },
  template,
  controller,
};
