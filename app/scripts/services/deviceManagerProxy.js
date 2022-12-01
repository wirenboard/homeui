function deviceManagerProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy("wb-device-manager/bus-scan", [
    "scan"
  ], "deviceManagerProxy");
}

export default deviceManagerProxyService;
