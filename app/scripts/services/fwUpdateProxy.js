function fwUpdateProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy(
    'wb-device-manager/fw-update',
    ['GetFirmwareInfo', 'Update'],
    'fwUpdateProxy'
  );
}

export default fwUpdateProxyService;
