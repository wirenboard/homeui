function serialMetricsProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy("wb-mqtt-serial/metrics", [
    "Load"
  ], "serialMetricsProxy");
}

export default serialMetricsProxyService;
