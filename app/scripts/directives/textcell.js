"use strict";

angular.module("homeuiApp")
  .directive("textCell", function () {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      template: "<input readonly class='cell cell-text' type='text' value='{{ cell.value }}'>"
    };
  });
