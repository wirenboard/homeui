"use strict";

angular.module("homeuiApp")
  .controller("DevicesCtrl", function ($scope, DeviceData) {
    $scope.devices = [];
    $scope.cell = id => DeviceData.cell(id);
    $scope.$watch(() => Object.keys(DeviceData.devices), () => {
      $scope.devices = Object.keys(DeviceData.devices)
        .sort().map(id => angular.extend({}, DeviceData.devices[id], { id: id }));
    }, true);
  });
