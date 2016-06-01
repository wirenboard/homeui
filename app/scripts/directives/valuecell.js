"use strict";

angular.module("homeuiApp")
  .directive("valueCell", function () {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      template: "<span class='cell cell-value'>{{ cell.value }} {{ cell.units }}</span>"
    };
  });
