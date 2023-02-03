function deviceManagerProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy("wb-device-manager/bus-scan", [
    "Scan", "Stop"
  ], "deviceManagerProxy");
}

export default deviceManagerProxyService;
