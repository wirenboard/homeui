'use strict';

export default function () {
    return {
        restrict: 'A',
        scope: true,
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {
            
            function validate(value) {
                var uiConfig = scope.$parent.$ctrl.uiConfig;
                var dashboard = scope.$parent.$ctrl.dashboard;

                var isExists = uiConfig.data.dashboards.some((otherDashboard) => {
                    return otherDashboard !== dashboard && otherDashboard.id === value;
                });

                ngModel.$setValidity('unique', !isExists);

                return value;
            }

            ngModel.$parsers.push(validate);
        }
    };
}