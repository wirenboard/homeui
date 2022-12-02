function deviceManagerProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy("wb-device-manager/bus-scan", [
    "Scan"
  ], "deviceManagerProxy");
}

export default deviceManagerProxyService;
