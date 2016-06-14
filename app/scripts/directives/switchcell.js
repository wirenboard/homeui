"use strict";

angular.module("homeuiApp")
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType("switch", "switch-cell");
  })
  .directive("switchCell", () => {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      templateUrl: "scripts/directives/switchcell.html"
    };
  });
