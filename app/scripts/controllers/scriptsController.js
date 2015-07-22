"use strict";

angular.module("homeuiApp")
  .controller("ScriptsCtrl", function ($scope, EditorProxy, whenMqttReady, errors) {
    $scope.scripts = [];
    whenMqttReady().then(function () {
      return EditorProxy.List();
    }).then(function (result) {
      $scope.scripts = result;
    }).catch(errors.catch("Error listing the scripts"));
  });
