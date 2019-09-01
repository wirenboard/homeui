import controller from './svgEdit.controller';
import template from './svgEdit.html';

export default {
    restrict: 'E',
    scope: true,
    bindings: {
        'dashboard': '='
    },
    template,
    controller
};