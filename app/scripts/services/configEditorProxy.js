"use strict";

angular.module("homeuiApp")
  .factory("ConfigEditorProxy", [ "MqttRpc", function (MqttRpc) {
    return MqttRpc.getProxy("confed/Editor", [
      "List",
      "Load",
      "Save"
    ], "configEditorProxy");
  }]);
