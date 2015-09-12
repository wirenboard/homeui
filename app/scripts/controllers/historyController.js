"use strict";

angular.module("homeuiApp")
  .controller("HistoryCtrl", function ($scope, $routeParams, $location, HistoryProxy,
                                       whenMqttReady, errors, CommonCode, historyMaxPoints) {
    $scope.datapoints = [];
    $scope.datacolumns = [
      { "id":"y", "type":"line", "color":"green" }
    ];
    $scope.datax = { "id":"x" };

    function convDate (ts) {
      if (ts == null || ts == "-")
        return null;
      var d = new Date();
      d.setTime(ts - 0);
      return d;
    }

    $scope.topic = $routeParams.device && $routeParams.control ?
      "/devices/" + $routeParams.device + "/controls/" + $routeParams.control :
      null;
    $scope.controls = CommonCode.data.controls;
    $scope.startDate = convDate($routeParams.start);
    $scope.endDate = convDate($routeParams.end);

    function parseTopic (topic) {
      if (!topic)
        return null;

      var m = topic.match(/^\/devices\/([^\/]+)\/controls\/([^\/]+)/);
      if (!m) {
        console.warn("bad topic: %s", topic);
        return null;
      }
      return {
        deviceId: m[1],
        controlId: m[2]
      };
    }

    $scope.selectedTopic = $scope.topic;
    $scope.selectedStartDate = $scope.startDate;
    $scope.selectedEndDate = $scope.endDate;

    function maybeUpdateUrl (newValue, oldValue) {
      if (newValue === oldValue || !$scope.selectedTopic)
        return;

      var parsedTopic = parseTopic($scope.selectedTopic);
      if (!parsedTopic)
        return;

      $location.path("/history/" + [
        parsedTopic.deviceId,
        parsedTopic.controlId,
        $scope.selectedStartDate ? $scope.selectedStartDate.getTime() : "-",
        $scope.selectedEndDate ? $scope.selectedEndDate.getTime() : "-"
      ].join("/"));
    }

    ["selectedTopic", "selectedStartDate", "selectedEndDate"].forEach(function (expr) {
      $scope.$watch(expr, maybeUpdateUrl);
    });

    $scope.popups = {
      start: false,
      end: false,
      showStart: function () {
        this.start = true;
      },
      showEnd: function () {
        this.end = true;
      }
    };
    var ready = false, loadPending = !!$scope.topic;

    function loadHistory () {
      if (!ready) {
        loadPending = true;
        return;
      }

      loadPending = false;
      if (!$scope.topic)
        return;

      var parsedTopic = parseTopic($scope.topic);
      if (!parseTopic)
        return;

      var params = {
        channels: [
          [parsedTopic.deviceId, parsedTopic.controlId]
        ],
        limit: historyMaxPoints
      };

      if ($scope.startDate) {
        params.timestamp = params.timestamp || {};
        // add extra second to include 00:00:00
        // (FIXME: maybe wb-mqtt-db should support not just gt/lt, but also gte/lte?)
        params.timestamp.gt = $scope.startDate.getTime() / 1000 - 1;
      }

      if ($scope.endDate) {
        params.timestamp = params.timestamp || {};
        params.timestamp.lt = $scope.endDate.getTime() / 1000 + 86400;
      }

      HistoryProxy.get_values(params).then(function (result) {
        $scope.datapoints = result.values.map(function (item) {
          var ts = new Date();
          ts.setTime(item.timestamp * 1000);
          return {
            x: ts,
            y: item.value - 0
          };
        });
      }).catch(errors.catch("Error getting history"));
    }

    whenMqttReady().then(function () {
      ready = true;
      if (loadPending)
        loadHistory();
    });

    function loadHistoryOnChange(newValue, oldValue) {
      if (newValue !== oldValue)
        loadHistory();
    }

    $scope.$watch("topic", loadHistoryOnChange);
    $scope.$watch("startDate", loadHistoryOnChange);
    $scope.$watch("endDate", loadHistoryOnChange);
  });
