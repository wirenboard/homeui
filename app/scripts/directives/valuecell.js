"use strict";

angular.module("homeuiApp")
  .directive("valueCell", () => {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      templateUrl: "scripts/directives/valuecell.html"
    };
  });
