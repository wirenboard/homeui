"use strict";

angular.module("homeuiApp")
  .controller("ScriptCtrl", function ($scope, $routeParams, $timeout, EditorProxy, whenMqttReady, gotoDefStart, $location) {
    var cm, pos = null;
    $scope.file = {
      isNew: !$routeParams.hasOwnProperty("path"),
      path: $routeParams.path,
      loaded: false,
      content: ""
    };

    if (!$scope.file.isNew) {
      var m = $scope.file.path.match(/\/D(\d+):(\d+)$/);
      if (m) {
        $scope.file.path = $scope.file.path.substring(0, m.index);
        pos = CodeMirror.Pos(m[1] - 0, m[2] - 0);
      }
    }

    $scope.codeMirrorLoaded = function(_cm){
      cm = _cm;
      cm.focus();
    };

    // AngularJS expression parser seemingly chokes on Infinity,
    // thinks its a variable name (?)
    $scope.vpMargin = Infinity;
    $scope.save = function save () {
      if (!$scope.file.isNew && !$scope.file.loaded)
        return;
      EditorProxy.Save({ path: $scope.file.path, content: $scope.file.content })
        .then(function (reply) {
          if ($scope.file.isNew)
            $location.path("/scripts/edit/" + reply.path);
        });
    };

    if (!$scope.file.isNew) {
      whenMqttReady().then(function () {
        return EditorProxy.Load({ path: $scope.file.path });
      }).then(function (r) {
        $scope.file.content = r.content;
        $scope.file.loaded = true;
        if (pos !== null) {
          $timeout(function () {
            cm.setCursor(pos.line, pos.ch);
            gotoDefStart(cm);
          });
        }
      }, function (e) {
        console.error("error loading %s: %s", $scope.file.path, e.message);
      });
    }
  });
