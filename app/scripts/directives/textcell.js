"use strict";

angular.module("homeuiApp")
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType("text", "text-cell");
  })
  .directive("textCell", () => {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      template: "<input ng-readonly='cell.readOnly' class='cell cell-text' type='text' ng-model='cell.value' explicit-changes>"
    };
  });
