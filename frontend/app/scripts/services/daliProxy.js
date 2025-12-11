export default function daliProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy('wb-mqtt-dali/Editor',
    [
      'GetList',
      'GetGateway',
      'SetGateway',
      'GetBus',
      'SetBus',
      'ScanBus',
      'GetDevice',
      'SetDevice',
      'GetGroup',
      'SetGroup',
    ],
    'daliProxy');
}
