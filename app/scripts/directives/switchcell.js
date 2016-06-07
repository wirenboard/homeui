"use strict";

angular.module("homeuiApp")
  .directive("switchCell", () => {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      // ng-switch-default
      // Extra <span> around the template is needed to avoid
      // "Multiple directives ... asking for new/isolated scope on" error.
      template: "<span ng-switch on='cell.readOnly' class='cell cell-switch'>" +
        "<input ng-switch-when='true' type='checkbox' readonly disabled ng-model='cell.value'>" +
        "<toggle-switch ng-switch-default class='control-value' ng-model='cell.value'></toggle-cell>" +
        "</span>"
    };
  });
