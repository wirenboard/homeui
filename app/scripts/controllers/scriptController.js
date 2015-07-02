"use strict";

angular.module("homeuiApp")
  .controller("ScriptCtrl", ["$scope", "$routeParams", "$timeout", "EditorProxy", "whenMqttReady", "gotoDefStart", function ($scope, $routeParams, $timeout, EditorProxy, whenMqttReady, gotoDefStart) {
    var cm, pos = null;
    $scope.path = $routeParams.path;
    var m = $scope.path.match(/\/D(\d+):(\d+)$/);
    if (m) {
      $scope.path = $scope.path.substring(0, m.index);
      pos = CodeMirror.Pos(m[1] - 0, m[2] - 0);
    }
    $scope.codeMirrorLoaded = function(_cm){
      cm = _cm;
      cm.focus();
    };
    // AngularJS expression parser seemingly chokes on Infinity,
    // thinks its a variable name (?)
    $scope.vpMargin = Infinity;
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
      if (pos !== null) {
        $timeout(function () {
          cm.setCursor(pos.line, pos.ch);
          gotoDefStart(cm);
        });
      }
    }, function (e) {
      console.error("error loading %s: %s", $scope.path, e.message);
    });
  }]);
