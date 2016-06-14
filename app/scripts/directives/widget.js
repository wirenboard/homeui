"use strict";

angular.module("homeuiApp")
  .directive("widget", function (DeviceData) {
    class WidgetController {
      constructor ($scope, $element, $attrs) {
      }

      get source () {
        return this._source() || {
          name: "",
          compact: true,
          cells: []
        };
      }
    }

    return {
      restrict: "EA",
      bindToController: {
        _source: "&source"
      },
      controllerAs: "ctrl",
      controller: WidgetController,
      replace: true,
      templateUrl: "scripts/directives/widget.html"
    };
  });
