import ReactDOM from 'react-dom/client';
import { autorun } from 'mobx';
import CreateNetworkConnections from './networkConnections';
import { ConfigContextData } from './context/ConfigContext';
import { ConnectionsStateContextData } from './context/ConnectionsStateContext';

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
      scope.configContext = ConfigContextData(scope.onSave);
      scope.connectionsStateContext = ConnectionsStateContextData(scope.toggleConnectionState);

      autorun(() => {
        PageState.setDirty(scope.configContext.isDirty);
        // PageState.setDirty(scope.editor.connections.connections.find((connection) => connection.isChanged));
      });
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateNetworkConnections({
        configContextData: scope.configContext,
        connectionsStateContextData: scope.connectionsStateContext,
      }));

      const re = new RegExp('/devices/system__networks__([^/]+)/');
      whenMqttReady().then(() => {
        ConfigEditorProxy.Load({ path: scope.path }).then((r) => {
          scope.configPath = r.configPath;
          scope.configContext.setConfigData(r.content, r.schema);
          mqttClient
            .addStickySubscription('/devices/+/controls/State', (msg) => {
              const match = msg.topic.match(re);
              if (match) {
                scope.connectionsStateContext.setStateFromSubscriber(match[1], msg.payload);
              }
            })
            .catch((err) => {
              scope.configContext.error = err.message;
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
