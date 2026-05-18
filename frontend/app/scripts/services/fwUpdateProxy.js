function fwUpdateProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy(
    'wb-mqtt-serial/fw-update',
    ['GetFirmwareInfo', 'Update', 'ClearError', 'Restore'],
    'fwUpdateProxy'
  );
}

export default fwUpdateProxyService;
