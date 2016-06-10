"use strict";

angular.module("homeuiApp")
  .directive("cell", function (DeviceData, $parse) {
    class CellController {
      constructor ($scope, $element, $attrs) {
        this.cell = $scope.cell = DeviceData.proxy($scope.$eval($attrs.cell));
      }
    }

    return {
      restrict: "A",
      scope: true,
      priority: 1, // take precedence over ng-model
      controller: CellController
    };
  });
