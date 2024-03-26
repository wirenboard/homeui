function serialProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy('wb-mqtt-serial/config', ['Load', 'GetSchema'], 'serialProxy');
}

export default serialProxyService;
