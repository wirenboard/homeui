function editorProxyService(MqttRpc) {
  'ngInject';
  return MqttRpc.getProxy(
    'wbrules/Editor',
    ['ChangeState', 'List', 'Load', 'Save', 'Remove', 'Rename'],
    'editorProxy'
  );
}

export default editorProxyService;
