function configEditorProxyService(MqttRpc) {
  return MqttRpc.getProxy("confed/Editor", [
    "List",
    "Load",
    "Save"
  ], "configEditorProxy");
}

export default configEditorProxyService;
