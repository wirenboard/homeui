"use strict";

angular.module("homeuiApp")
  .controller("ScriptCtrl", ["$scope", "$routeParams", "EditorProxy", "whenMqttReady", function ($scope, $routeParams, EditorProxy, whenMqttReady) {
    $scope.path = $routeParams.path;
    $scope.loaded = false;
    $scope.content = "";
    $scope.save = function save () {
      if (!$scope.loaded)
        return;
      EditorProxy.Save({ path: $scope.path, content: $scope.content });
    };
    whenMqttReady().then(function () {
      return EditorProxy.Load({ path: $scope.path });
    }).then(function (r) {
      $scope.content = r.content;
      $scope.loaded = true;
    }, function (e) {
      console.error("error loading %s: %s", $scope.path, e.message);
    });
  }]);
