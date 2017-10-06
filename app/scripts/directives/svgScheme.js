
export function svgSchemeDirective($compile, DeviceData, $interval) {
    'ngInject';
    return {
        restrict: 'E',
        scope : {
            svgFullWidth: "=",
            url: "=",
            topic: '@'
            //devices: "="
        },
        template: '<div ng-include="url"></div>',
        link: function (scope, element, attrs) {


            //scope.devices =  DeviceData.devices;
            $interval(()=> {
                var t = scope.topic || 'wb-map12h_91/Ch 2 Pfund L3';
                scope.val = DeviceData.proxy(t).value/2;
                scope.topicName = t.split('/')[0];
                scope._val = DeviceData.proxy(t).value;
            },1000);
            var elem = element[0];
            var svg = element[0].querySelector("svg");
            var w = angular.element(svg).width(),
                h = angular.element(svg).height(),
                _w = angular.element(elem).width(),
                //_h = angular.element(elem).height(),
                r = _w / w;


            if (scope.svgFullWidth) {
                angular.element(svg).attr("width", w * r);
                angular.element(elem).attr("height", h * r );
                angular.element(svg).attr("height", h * r);
            }
        }
    }
}

export  function svgCompiledElementDirective($compile) {
     'ngInject';
    return {
        restrict: 'A',
        scope: {
            val: "=",
            type: "=",
            units: "=",
            error: "="
        },
        link: function (scope, element, attrs) {
            element.removeAttr("svg-compiled-element");
            $compile(element)(scope);
        }
    }
}