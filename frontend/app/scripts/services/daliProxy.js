export default function daliProxyService(MqttRpc) {
  'ngInject';

  return MqttRpc.getProxy('wb-mqtt-dali/Editor',
    [
      'GetList',
      'GetGateway',
      'SetGateway',
      'GetBus',
      'SetBus',
      'Scan',
      'GetDevice',
      'SetDevice',
      'GetGroup',
      'SetGroup',
    ],
    'daliProxy');
}
