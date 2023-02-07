import ReactDOM from 'react-dom/client';
import { autorun } from 'mobx';
import CreateNetworkConnections from './networkConnections';
import { NetworksEditor } from './editorStore';

function networkConnectionsDirective(mqttClient, whenMqttReady, ConfigEditorProxy, PageState) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {
      path: '=',
    },
    link(scope, element) {
      scope.onSave = (data) => ConfigEditorProxy.Save({ path: scope.path, content: data });
      scope.toggleConnectionState = (uuid) => {
        mqttClient.send(`/devices/system__networks__${uuid}/controls/UpDown/on`, '1', false);
      };

      if (scope.root) {
        scope.root.unmount();
      }
      scope.editor = new NetworksEditor(scope.onSave, scope.toggleConnectionState);
      autorun(() => {
        PageState.setDirty(scope.editor.connections.connections.find((connection) => connection.isChanged));
      });
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateNetworkConnections({ editor: scope.editor }));

      const re = new RegExp('/devices/system__networks__([^/]+)/');
      whenMqttReady().then(() => {
        ConfigEditorProxy.Load({ path: scope.path }).then((r) => {
          scope.configPath = r.configPath;
          scope.editor.connections.setSchemaAndData(r.schema, r.content);
          mqttClient
            .addStickySubscription('/devices/+/controls/State', (msg) => {
              const match = msg.topic.match(re);
              if (match) {
                const connection = scope.editor.connections.connections.find(
                  (con) => con.data.connection_uuid == match[1],
                );
                if (connection) {
                  connection.setState(msg.payload);
                }
              }
            })
            .catch((err) => {
              scope.editor.connections.error = err.mesage;
            });
        });
      });

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}

export default networkConnectionsDirective;
