"use strict";

angular.module("homeuiApp")
  .controller("ScriptsCtrl", ["$scope", "EditorProxy", "whenMqttReady", function ($scope, EditorProxy, whenMqttReady) {
    $scope.scripts = [];
    whenMqttReady().then(function () {
      return EditorProxy.List();
    }).then(function (result) {
      $scope.scripts = result;
    }, function (err) {
      console.error("error listing scripts: %s", err.message);
    });
  }]);
