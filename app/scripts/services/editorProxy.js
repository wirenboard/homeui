function editorProxyService(MqttRpc) {
  return MqttRpc.getProxy("wbrules/Editor", [
    "List",
    "Load",
    "Save",
    "Remove"
  ], "editorProxy");
}

export default editorProxyService;
