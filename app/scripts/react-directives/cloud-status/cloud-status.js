'use strict';

import ReactDOM from 'react-dom/client';
import CreateCloudStatusWidget from './cloudStatusWidget';
import CloudStatusStore from './store';

function cloudStatusDirective(mqttClient, whenMqttReady, DeviceData) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new CloudStatusStore();
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateCloudStatusWidget({ store: scope.store }));

      whenMqttReady().then(() => {
        mqttClient.addStickySubscription('/devices/system__wb-cloud-agent/controls/status', msg => {
          scope.store.updateStatus(msg.payload);
        });

        mqttClient.addStickySubscription(
          '/devices/system__wb-cloud-agent/controls/activation_link',
          msg => {
            scope.store.updateActivationLink(msg.payload);
          }
        );
      });

      mqttClient.whenReady().then(() => {
        try {
          scope.store.setSn(DeviceData.cell('system/Short SN').value);
        } catch (e) {}
      });

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}

export default cloudStatusDirective;
