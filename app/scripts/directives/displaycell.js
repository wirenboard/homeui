"use strict";

angular.module("homeuiApp")
  .directive("displayCell", () => {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      templateUrl: "scripts/directives/displaycell.html"
    };
  });
