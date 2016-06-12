"use strict";

angular.module("homeuiApp")
  .controller("DevicesCtrl", function ($scope, DeviceData) {
    $scope.dev = devId => DeviceData.devices[devId];
    $scope.cell = id => DeviceData.cell(id);
    $scope.$watch(() => Object.keys(DeviceData.devices), () => {
      $scope.deviceIds = Object.keys(DeviceData.devices).sort();
    }, true);
  });
