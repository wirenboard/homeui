function editorProxyService(MqttRpc) {
  'ngInject';
  return MqttRpc.getProxy("wbrules/Editor", [
    "ChangeState",
    "List",
    "Load",
    "Save",
    "Remove"
  ], "editorProxy");
}

export default editorProxyService;
