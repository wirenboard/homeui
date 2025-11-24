function serialDeviceProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy('wb-mqtt-serial/device', ['LoadConfig'], 'serialDeviceProxy');
}

export default serialDeviceProxyService;
