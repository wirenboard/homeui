"use strict";

angular.module("homeuiApp")
  .factory("HistoryProxy", function (MqttRpc) {
    return MqttRpc.getProxy("db_logger/history", [
      "get_values"
    ], "historyProxy");
  });
