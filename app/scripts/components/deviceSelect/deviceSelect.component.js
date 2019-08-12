'use strict';

import template from './deviceSelect.html';
import controller from './deviceSelect.controller';

export default {
    restrict: 'E',
    bindings: {
        'value': '='
    },
    template,
    controller
};