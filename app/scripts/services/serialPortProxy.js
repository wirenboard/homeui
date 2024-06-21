function serialPortProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy('wb-mqtt-serial/port', ['Setup'], 'serialPortProxy');
}

export default serialPortProxyService;
