"use strict";

angular.module("homeuiApp")
  .directive("valueCell", function () {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      template: "<span class='cell cell-value'>" +
        "<input ng-readonly='cell.readOnly' type='number'" +
        "  min='{{cell.min}}' max='{{cell.max}}' step='{{cell.step}}'" +
        "  ng-model='cell.value' explicit-changes>" +
        "<span class='units'>{{ cell.units }}</span>" +
        "</span>"
    };
  });
