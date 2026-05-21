export default function daliBusProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy('wb-mqtt-dali/Bus',
    [
      'SendCommand',
      'ListCommands',
    ],
    'daliBusProxy');
}
