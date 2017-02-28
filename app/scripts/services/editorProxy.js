function editorProxyService(MqttRpc) {
  'ngInject';
  return MqttRpc.getProxy("wbrules/Editor", [
    "List",
    "Load",
    "Save",
    "Remove"
  ], "editorProxy");
}

export default editorProxyService;
