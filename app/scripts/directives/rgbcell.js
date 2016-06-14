"use strict";

angular.module("homeuiApp")
  .value("rgbLocalStorageKey", "cell_rgb_palette")
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType("rgb", "rgb-cell");
  })
  .directive("rgbCell", rgbLocalStorageKey => {
    class RgbController {
      constructor ($scope, $element, $attrs) {
        this.cell = $scope.cell;
        this.colorPickerOptions = {
          showPalette: true,
          showButtons: false
        };
        if (rgbLocalStorageKey)
          this.colorPickerOptions.localStorageKey = rgbLocalStorageKey;
      }

      indicatorStyle () {
        var c = this.cell.value;
        if (!angular.isObject(c))
          return {};
        return {
          "background-color": "rgb(" + [c.r, c.g, c.b].join(",") + ")"
        };
      }
    }

    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      controllerAs: "ctrl",
      templateUrl: "scripts/directives/rgbcell.html",
      controller: RgbController
    };
  });
