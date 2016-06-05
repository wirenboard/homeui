"use strict";

angular.module("homeuiApp")
  .directive("buttonCell", function () {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      template: "<button type='button' ng-click='cell.value = true' " +
        "ng-disabled='cell.readOnly' class='cell cell-button'>{{ cell.name }}</button>"
    };
  });
