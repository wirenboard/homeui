function diagnosticProxyService(MqttRpc) {
  'ngInject';
  return MqttRpc.getProxy("/rpc/v1/diag/main/", [
    "diag",
  ], "diagnosticProxy");
}

export default diagnosticProxyService;
