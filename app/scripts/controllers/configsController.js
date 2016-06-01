"use strict";

angular.module("homeuiApp")
  .controller("ConfigsCtrl", function ($scope, ConfigEditorProxy, whenMqttReady, errors) {
    $scope.configs = [];
    whenMqttReady().then(() => ConfigEditorProxy.List()).then(result => {
      $scope.configs = result;
    }).catch(errors.catch("Error listing the configs"));
  });
