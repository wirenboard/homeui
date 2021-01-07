import controller from './svgUpload.controller';
import template from './svgUpload.html';

export default {
    restrict: 'E',
    bindings: {
        'dashboard': '='
    },
    template,
    controller
};