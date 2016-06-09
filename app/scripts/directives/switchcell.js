"use strict";

angular.module("homeuiApp")
  .directive("switchCell", () => {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      templateUrl: "scripts/directives/switchcell.html"
    };
  });
