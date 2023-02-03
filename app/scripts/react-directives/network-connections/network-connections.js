'use strict';

import ReactDOM from 'react-dom/client';
import CreateNetworkConnections from './networkConnections';
import Connections from './connectionsStore';
import { autorun } from 'mobx';

function networkConnectionsDirective(mqttClient, whenMqttReady, ConfigEditorProxy, PageState) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {
      path: '=',
    },
    link: function (scope, element) {
      scope.onSave = data => {
        return ConfigEditorProxy.Save({ path: scope.path, content: data });
      };
      scope.toggleConnectionState = uuid => {
        mqttClient.send(`/devices/system__networks__${uuid}/controls/UpDown/on`, '1', false);
      };

      if (scope.root) {
        scope.root.unmount();
      }
      scope.connections = new Connections(scope.onSave, scope.toggleConnectionState);
      autorun(() => {
        PageState.setDirty(scope.connections.connections.find(connection => connection.isChanged));
      });
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateNetworkConnections({ connections: scope.connections }));

      const re = new RegExp('/devices/system__networks__([^/]+)/');
      whenMqttReady().then(() => {
        ConfigEditorProxy.Load({ path: scope.path }).then(r => {
          scope.configPath = r.configPath;
          scope.connections.setSchemaAndData(r.schema, r.content);
          mqttClient
            .addStickySubscription('/devices/+/controls/State', msg => {
              const match = msg.topic.match(re);
              if (match) {
                var connection = scope.connections.connections.find(
                  con => con.data.connection_uuid == match[1]
                );
                if (connection) {
                  connection.setState(msg.payload);
                }
              }
            })
            .catch(err => {
              scope.connections.error = err.mesage;
            });
        });
      });

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default networkConnectionsDirective;
