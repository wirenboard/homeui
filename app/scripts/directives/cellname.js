"use strict";

angular.module("homeuiApp")
  .directive("cellName", () => {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      template: "<h4 class='cell-title'>{{ cell.name }}</h4>"
    };
  });
