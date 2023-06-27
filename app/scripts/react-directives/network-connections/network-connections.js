'use strict';

import ReactDOM from 'react-dom/client';
import CreateNetworkConnectionsPage from './networkConnectionsPage';
import { autorun } from 'mobx';
import NetworkConnectionsPageStore from './pageStore';

function networkConnectionsDirective(mqttClient, whenMqttReady, ConfigEditorProxy, PageState) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {
      path: '=',
    },
    link: function (scope, element) {
      const saveConnections = async data => {
        await ConfigEditorProxy.Save({ path: scope.path, content: data });
      };

      const loadConnections = async () => {
        const res = await ConfigEditorProxy.Load({ path: scope.path });
        return res.content.ui.connections;
      };

      scope.toggleConnectionState = uuid => {
        mqttClient.send(`/devices/system__networks__${uuid}/controls/UpDown/on`, '1', false);
      };

      if (scope.root) {
        scope.root.unmount();
      }
      scope.store = new NetworkConnectionsPageStore(
        saveConnections,
        loadConnections,
        scope.toggleConnectionState
      );
      autorun(() => {
        PageState.setDirty(scope.store.isDirty);
      });
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateNetworkConnectionsPage({ pageStore: scope.store }));

      const re = new RegExp('/devices/system__networks__([^/]+)/');
      const getUuidFromTopic = topic => topic.match(re)?.[1];

      whenMqttReady().then(() => {
        ConfigEditorProxy.Load({ path: scope.path })
          .then(r => {
            scope.configPath = r.configPath;
            scope.store.setSchemaAndData(r.schema, r.content);
            mqttClient.addStickySubscription('/devices/+/controls/State', msg => {
              scope.store.setConnectionState(getUuidFromTopic(msg.topic), msg.payload);
            });
            mqttClient.addStickySubscription('/devices/+/controls/Connectivity', msg => {
              scope.store.setConnectionConnectivity(
                getUuidFromTopic(msg.topic),
                msg.payload !== '0'
              );
            });
            mqttClient.addStickySubscription('/devices/+/controls/Operator', msg => {
              scope.store.setConnectionOperator(getUuidFromTopic(msg.topic), msg.payload);
            });
            mqttClient.addStickySubscription('/devices/+/controls/SignalQuality', msg => {
              scope.store.setConnectionSignalQuality(getUuidFromTopic(msg.topic), msg.payload);
            });
            mqttClient.addStickySubscription('/devices/+/controls/AccessTechnologies', msg => {
              scope.store.setConnectionAccessTechnologies(getUuidFromTopic(msg.topic), msg.payload);
            });
          })
          .catch(err => {
            scope.store.setError(err.message);
          });
      });

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default networkConnectionsDirective;
