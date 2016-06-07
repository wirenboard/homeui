"use strict";

angular.module("homeuiApp")
  .factory("ConfigEditorProxy", MqttRpc => {
    return MqttRpc.getProxy("confed/Editor", [
      "List",
      "Load",
      "Save"
    ], "configEditorProxy");
  });
