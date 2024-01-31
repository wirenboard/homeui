'use strict';

import ReactDOM from 'react-dom/client';
import CreateDevicesPage from './deviceManager';
import DeviceManagerStore from './pageStore';

function scanDirective(DeviceManagerProxy, whenMqttReady, mqttClient, $state) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      const updateSerialConfig = devices => {
        $state.go('serial-config', {
          devices: devices,
        });
      };

      scope.root = ReactDOM.createRoot(element[0]);
      scope.store = new DeviceManagerStore(DeviceManagerProxy, updateSerialConfig);

      scope.root.render(CreateDevicesPage(scope.store));

      element.on('$destroy', function () {
        scope.root.unmount();
      });

      whenMqttReady()
        .then(() => DeviceManagerProxy.hasMethod('Start'))
        .then(available => {
          if (available) {
            scope.store.mqttStore.setDeviceManagerAvailable();
            mqttClient.addStickySubscription('/wb-device-manager/state', msg =>
              scope.store.update(msg.payload)
            );
          } else {
            scope.store.setDeviceManagerUnavailable();
          }
        })
        .catch(() => {
          scope.store.setDeviceManagerUnavailable();
        });
    },
  };
}

export default scanDirective;
