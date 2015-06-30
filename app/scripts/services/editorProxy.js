"use strict";

angular.module("homeuiApp")
  .factory("EditorProxy", [ "MqttRpc", function (MqttRpc) {
    return MqttRpc.getProxy("wbrules/Editor", [
      "List",
      "Load",
      "Save",
      "Remove"
    ]);
  }]);
