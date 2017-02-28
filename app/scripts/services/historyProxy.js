function historyProxyService(MqttRpc) {
  return MqttRpc.getProxy("db_logger/history", [
    "get_values"
  ], "historyProxy");
}

export default historyProxyService;
