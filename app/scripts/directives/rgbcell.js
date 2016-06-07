"use strict";

angular.module("homeuiApp")
  .value("rgbLocalStorageKey", "cell_rgb_palette")
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
      template: "<span class='cell cell-rgb'>" +
        "<spectrum-colorpicker ng-if='!cell.readOnly'" +
        " format='rgb'" +
        " options='ctrl.colorPickerOptions'" +
        " on-show-options='{ update : false }'" +
        " on-hide-options='{ update : false }'" +
        " on-move-options='{ update : false }'" +
        " transform-rgb ng-model='cell.value'></spectrum-colorpicker>" +
        "<span ng-if='cell.readOnly' class='color-indicator' ng-style='ctrl.indicatorStyle()'></span>" +
        "</span>",
      controller: RgbController
    };
  });
