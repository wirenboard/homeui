function fwUpdateProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy(
    'wb-device-manager/fw-update',
    ['GetFirmwareInfo', 'Update', 'ClearError'],
    'fwUpdateProxy'
  );
}

export default fwUpdateProxyService;
