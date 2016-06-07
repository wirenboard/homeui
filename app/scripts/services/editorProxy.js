"use strict";

angular.module("homeuiApp")
  .factory("EditorProxy", MqttRpc => {
    return MqttRpc.getProxy("wbrules/Editor", [
      "List",
      "Load",
      "Save",
      "Remove"
    ], "editorProxy");
  });
