"use strict";

angular.module("homeuiApp")
  .directive("explicitChanges", function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, element, attr, ngModelCtrl) {
        if (attr.type === 'radio' || attr.type === 'checkbox')
          return;

        function sendValue () {
          scope.$apply(() => {
            ngModelCtrl.$setViewValue(element.val());
          });
        }

        element.off('input').off('keydown').off('change');
        element.on('blur', sendValue);
        element.on('keydown', e => {
          if (e.keyCode == 13)
            sendValue();
          else if (e.keyCode == 27)
            element.val(ngModelCtrl.$viewValue);
        });
      }
    };
  });
