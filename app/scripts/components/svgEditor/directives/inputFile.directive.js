'use strict';

export default function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {
            element.bind('change', function(e) {
                var file = element[0].files[0];
                ngModel.$setViewValue(file);
            });
        }
    };
}