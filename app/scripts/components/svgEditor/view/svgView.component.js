import controller from './svgView.controller';
import template from './svgView.html';

export default {
    restrict: 'E',
    bindings: {
        'dashboard': '='
    },
    template,
    controller
};