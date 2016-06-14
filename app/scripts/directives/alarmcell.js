"use strict";

angular.module("homeuiApp")
  .config(displayCellConfigProvider => {
    displayCellConfigProvider.addDisplayType("alarm", "alarm-cell", true);
  })
  .directive("alarmCell", () => {
    return {
      restrict: "EA",
      scope: false,
      require: "^cell",
      replace: true,
      template: "<h4 class='cell cell-alarm alarm' ng-class=\"{ 'alarm-active': cell.value }\">{{ cell.name }}</h4>"
    };
  });
