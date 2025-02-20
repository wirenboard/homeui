function diagnosticProxyService(MqttRpc) {
  'ngInject';
  return MqttRpc.getProxy('diag/main', ['diag', 'status'], 'diagnosticProxy');
}

export default diagnosticProxyService;
