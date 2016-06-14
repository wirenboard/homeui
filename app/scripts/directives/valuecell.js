"use strict";

angular.module("homeuiApp")
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType("value", "value-cell");
  })
  .directive("valueCell", () => {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      templateUrl: "scripts/directives/valuecell.html"
    };
  });
