"use strict";

angular.module("homeuiApp")
  .directive("rangeCell", () => {
    const DEFAULT_MIN = -1e9, DEFAULT_MAX = 1e9, DEFAULT_STEP = 1e-3;
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      template: "<input class='cell cell-range'" +
        " ng-readonly='cell.readOnly' type='range'" +
        " ng-model='cell.value'>",
      link: ($scope, element, attr, cellCtrl) => {
        // Make sure min/max/step are initialized to a range that is
        // broad enough for the range control to initialize correctly.
        // See https://github.com/angular/angular.js/issues/6726
        function relayAttr (name, defaultValue) {
          $scope.$watch(() => cellCtrl.cell[name], newValue => {
            element.attr(name, cellCtrl.cell[name] === null ? defaultValue : cellCtrl.cell[name]);
          });
        }
        relayAttr("min", DEFAULT_MIN);
        relayAttr("max", DEFAULT_MAX);
        relayAttr("step", DEFAULT_STEP);
      }
    };
  });
