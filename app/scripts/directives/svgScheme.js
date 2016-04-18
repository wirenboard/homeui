angular.module('homeuiApp').directive('svgScheme', ['$compile', function ($compile) {
    return {
        restrict: 'A',
        scope : {
            svgFullWidth: "=",
            devices: "="
        },

        link: function (scope, element, attrs) {
            var svg = element[0].querySelector("svg");
            if (scope.svgFullWidth) {
                angular.element(svg).attr("width", "100%");
                angular.element(svg).attr("height", "100%");
            }

            var regions = element[0].querySelectorAll("text");
            angular.forEach(regions, function (path, key) {
                var element = angular.element(path);
                element.attr("svg-text-element", "");

                var desc = element[0].querySelector("desc");
                if (desc != null) {
                    var channelStr = desc.innerHTML; //dev_id/control_id
                    var channelArr = channelStr.split("/");
                    if (channelArr.length == 2) {
                        var deviceId = channelArr[0];
                        var controlId = channelArr[1];
                        var channelVar = 'devices["' + deviceId + '"].controls["' + controlId + '"]';

                        element.attr("val", channelVar + '.value');
                        element.attr("type", channelVar + '.metaType');
                        element.attr("units", channelVar + '.metaUnits');
                        element.attr("error", channelVar + '.metaError');

                    }
                }
                $compile(element)(scope);
            })
        }
    }
}]);


angular.module('homeuiApp')
.directive('svgTextElement',
    ['$rootScope', '$compile', 'CommonCode', function ($rootScope, $compile, CommonCode)
{
    return {
        restrict: 'A',
        scope: {
            val: "=",
            type: "=",
            units: "=",
            error: "=",
        },
        link: function (scope, element, attrs) {
            element.removeAttr("svg-text-element");
            $compile(element)(scope);
        }
    }
}]);