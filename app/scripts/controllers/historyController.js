"use strict";

angular.module("homeuiApp")
  .controller("HistoryCtrl", function ($scope, $routeParams, $location, HistoryProxy,
                                       whenMqttReady, errors, historyMaxPoints,
                                       $timeout, dateFilter, uiConfig, orderByFilter) {
    function convDate (ts) {
      if (ts == null || ts == "-")
        return null;
      var d = new Date();
      d.setTime(ts - 0);
      return d;
    }

    function topicFromCellId (cellId) {
      return "/devices/" + cellId.replace("/", "/controls/");
    }

    $scope.dataPoints = [];
    $scope.topic = $routeParams.device && $routeParams.control ?
      "/devices/" + $routeParams.device + "/controls/" + $routeParams.control :
      null;
    $scope.controls = [];
    uiConfig.whenReady().then((data) => {
      $scope.controls = orderByFilter(
        Array.prototype.concat.apply(
          [], data.widgets.map(widget =>
                               widget.cells.map(cell =>
                                                ({
                                                  topic: topicFromCellId(cell.id),
                                                  name: widget.name + " / " + (cell.name || cell.id)
                                                })))),
        "name");
    });
    $scope.startDate = convDate($routeParams.start);
    $scope.endDate = convDate($routeParams.end);
    $scope.shouldShowChart = function () {
      return !$scope.spinnerActive("historyProxy") &&
        $scope.topic !== null &&
        !!$scope.chartConfig;
    };

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
        limit: historyMaxPoints,
        ver: 1
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

      if ($scope.startDate) {
	var endDate = $scope.endDate || Date.now();
	var intervalMs = endDate - $scope.startDate; // duration of requested interval, in ms

	// we want to request  no more than "limit" data points.
	// Additional divider 1.1 is here just to be on the safe side
	params.min_interval = intervalMs / params.limit * 1.1;
      }

      HistoryProxy.get_values(params).then(function (result) {
        if (result.has_more)
          errors.showError("Warning", "maximum number of points exceeded. Please select start date.");
        var xValues = result.values.map(item => {
          var ts = new Date();
          ts.setTime(item.t * 1000);
          return dateFilter(ts, "yyyy-MM-dd HH:mm:ss");
        }), yValues = result.values.map(item => item.v - 0);
        $scope.chartConfig = {
          data: {
            x: "x",
            xFormat: "%Y-%m-%d %H:%M:%S",
            columns: [
              ["x"].concat(xValues),
              ["y"].concat(yValues)
            ]
          },
          axis: {
            x: {
              type: "timeseries",
              tick: {
                count: 10,
                format: "%Y-%m-%d %H:%M:%S"
              }
            }
          },
          point: {
            show: false
          },
          zoom: {
            enabled: true
          },
          color: {
            pattern: ["green"]
          }
        };
        $scope.dataPoints = xValues.map((x, i) => ({ x: x, y: yValues[i] }));
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
