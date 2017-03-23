import 'c3/c3.css';

class HistoryCtrl {
  //...........................................................................
  constructor($scope, $stateParams, $location, HistoryProxy,
             whenMqttReady, errors, historyMaxPoints,
             dateFilter, uiConfig, orderByFilter) {
    'ngInject';

    var vm = this;

    this.scope = $scope;
    this.location = $location;
    this.historyMaxPoints = historyMaxPoints;
    this.HistoryProxy = HistoryProxy;
    this.dateFilter = dateFilter;
    this.errors = errors;

    this.dataPoints = [];
    this.topic = $stateParams.device && $stateParams.control ?
      "/devices/" + $stateParams.device + "/controls/" + $stateParams.control :
      null;

    this.startDate = this.convDate($stateParams.start);
    this.endDate = this.convDate($stateParams.end);

    this.selectedTopic = this.topic;
    this.selectedStartDate = this.startDate;
    this.selectedEndDate = this.endDate;

    this.controls = [];

    uiConfig.whenReady().then((data) => {
      this.controls = orderByFilter(
        Array.prototype.concat.apply(
          [], data.widgets.map(widget =>
                               widget.cells.map(cell =>
                                                ({
                                                  topic: this.topicFromCellId(cell.id),
                                                  name: widget.name + " / " + (cell.name || cell.id)
                                                })))),
        "name");
    });

    ["$ctrl.selectedTopic", "$ctrl.selectedStartDate", "$ctrl.selectedEndDate"].forEach((expr) => {
      $scope.$watch(expr, maybeUpdateUrl);
    });

    this.popups = {
      start: false,
      end: false,
      showStart: () => {
        this.popups.start = true;
      },
      showEnd: () => {
        this.popups.end = true;
      }
    };

    this.ready = false;
    this.loadPending = !!this.topic;

    whenMqttReady().then(() => {
      this.ready = true;
      if (this.loadPending) {
        this.loadHistory();
      }
    });

    $scope.$watch("$ctrl.topic", this.loadHistoryOnChange);
    $scope.$watch("$ctrl.startDate", this.loadHistoryOnChange);
    $scope.$watch("$ctrl.endDate", this.loadHistoryOnChange);

    //...........................................................................
    function maybeUpdateUrl(newValue, oldValue) {
      if (newValue === oldValue || !vm.selectedTopic)
        return;

      var parsedTopic = vm.parseTopic(vm.selectedTopic);
      if (!parsedTopic)
        return;

      vm.location.path("/history/" + [
        parsedTopic.deviceId,
        parsedTopic.controlId,
        vm.selectedStartDate ? vm.selectedStartDate.getTime() : "-",
        vm.selectedEndDate ? vm.selectedEndDate.getTime() : "-"
      ].join("/"));
    } // maybeUpdateUrl
  } // constructor

  //...........................................................................
  loadHistoryOnChange(newValue, oldValue) {
    if (newValue !== oldValue)
      this.loadHistory();
  }

  //...........................................................................
  convDate(ts) {
    if (ts == null || ts == "-") {
      return null;
    }
    var d = new Date();
    d.setTime(ts - 0);
    return d;
  }

  //...........................................................................
  topicFromCellId(cellId) {
    return "/devices/" + cellId.replace("/", "/controls/");
  }

  //...........................................................................
  parseTopic(topic) {
    if (!topic) {
      return null;
    }

    var m = topic.match(/^\/devices\/([^\/]+)\/controls\/([^\/]+)/);
    if (!m) {
      console.warn("bad topic: %s", topic);
      return null;
    }
    return {
      deviceId: m[1],
      controlId: m[2]
    };
  } // parseTopic

  //...........................................................................
  shouldShowChart() {
    return !this.scope.spinnerActive("historyProxy") &&
      this.topic !== null &&
      !!this.chartConfig;
  }

  //...........................................................................
  loadHistory () {
    if (!this.ready) {
      this.loadPending = true;
      return;
    }

    this.loadPending = false;
    if (!this.topic) {
      return;
    }

    var parsedTopic = this.parseTopic(this.topic);
    if (!parsedTopic) {
      return;
    }

    var params = {
      channels: [
        [parsedTopic.deviceId, parsedTopic.controlId]
      ],
      limit: this.historyMaxPoints,
      ver: 1
    };

    if (this.startDate) {
      params.timestamp = params.timestamp || {};
      // add extra second to include 00:00:00
      // (FIXME: maybe wb-mqtt-db should support not just gt/lt, but also gte/lte?)
      params.timestamp.gt = this.startDate.getTime() / 1000 - 1;
    }

    if (this.endDate) {
      params.timestamp = params.timestamp || {};
      params.timestamp.lt = this.endDate.getTime() / 1000 + 86400;
    }

    if (this.startDate) {
      var endDate = this.endDate || Date.now();
      var intervalMs = endDate - this.startDate; // duration of requested interval, in ms

      // we want to request  no more than "limit" data points.
      // Additional divider 1.1 is here just to be on the safe side
      params.min_interval = intervalMs / params.limit * 1.1;
    }

    this.HistoryProxy.get_values(params).then((result) => {
      if (result.has_more)
        this.errors.showError("Warning", "maximum number of points exceeded. Please select start date.");
      var xValues = result.values.map(item => {
        var ts = new Date();
        ts.setTime(item.t * 1000);
        return this.dateFilter(ts, "yyyy-MM-dd HH:mm:ss");
      }), yValues = result.values.map(item => item.v - 0);
      this.chartConfig = {
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
      this.dataPoints = xValues.map((x, i) => ({ x: x, y: yValues[i] }));
    }).catch(this.errors.catch("Error getting history"));
  } // loadHistory
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.history', [])
    .controller('HistoryCtrl', HistoryCtrl);
