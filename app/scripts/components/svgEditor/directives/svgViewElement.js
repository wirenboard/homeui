'use strict';

export default function ($compile) {
    'ngInject';
    return {
        restrict: 'A',
        scope: {
            val: '=',
            type: '=',
            units: '=',
            error: '='
        },
        link: function (scope, element, attrs) {
            scope.devicedata = scope.$parent.devicedata;
            element.removeAttr('svg-view-element');
            $compile(element)(scope);
        }
    };
}