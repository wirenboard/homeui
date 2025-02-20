function historyProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy('db_logger/history', ['get_values'], 'historyProxy');
}

export default historyProxyService;
