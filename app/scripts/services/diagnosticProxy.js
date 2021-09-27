function diagnosticProxyService(MqttRpc) {
  'ngInject';
  return MqttRpc.getProxy("diag/main", [
    "diag",
  ], "diagnosticProxy");
}

export default diagnosticProxyService;
