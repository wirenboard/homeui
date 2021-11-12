function logsProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy("wb_logs/logs", [
    "Load",
    "List",
    "CancelLoad"
  ], "logsProxy");
}

export default logsProxyService;
