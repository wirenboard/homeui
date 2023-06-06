import template from './svgEditor.html';
import controller from './svgEditor.controller';

export default {
  restrict: 'E',
  bindings: {
    dashboard: '=',
  },
  template,
  controller,
};
