function deviceManagerProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy(
    'wb-device-manager/bus-scan',
    ['Start', 'Stop', 'GetFirmwareInfo'],
    'deviceManagerProxy'
  );
}

export default deviceManagerProxyService;
