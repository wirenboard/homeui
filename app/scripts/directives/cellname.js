"use strict";

angular.module("homeuiApp")
  .directive("cellName", () => {
    return {
      restrict: "EA",
      scope: {
        override: "&"
      },
      require: "^cell",
      replace: true,
      template: "<h4 class='cell-title'>{{ name() }}</h4>",
      link: (scope, element, attrs, cellCtrl) => {
        scope.name = () => scope.override() || cellCtrl.cell.name;
      }
    };
  });
