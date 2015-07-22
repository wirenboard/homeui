"use strict";

angular.module("homeuiApp")
  .value("AlertDelayMs", 5000)
  .controller("AlertCtrl", function ($scope, $timeout, AlertDelayMs) {
    var oldTimeout = null;
    $scope.visible = false;
    $scope.message = "";
    $scope.$on("alert", function (ev, message) {
      $scope.visible = true;
      $scope.message = message;
      if (oldTimeout !== null)
        $timeout.cancel(oldTimeout);
      oldTimeout = $timeout(function () {
        oldTimeout = null;
        $scope.visible = false;
      }, AlertDelayMs);
    });
  });
