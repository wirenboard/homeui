"use strict";

angular.module("homeuiApp")
  .controller("ConfigsCtrl", function ($scope, ConfigEditorProxy, whenMqttReady, errors) {
    $scope.configs = [];
    whenMqttReady().then(function () {
      return ConfigEditorProxy.List();
    }).then(function (result) {
      $scope.configs = result;
    }).catch(errors.catch("Error listing the configs"));
  });
