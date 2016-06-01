"use strict";

angular.module("homeuiApp")
  .directive("textCell", function () {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      template: "<input ng-readonly='cell.readOnly' class='cell cell-text' type='text' ng-model='cell.value' explicit-changes>"
    };
  });
