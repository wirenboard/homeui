import ReactDOM from 'react-dom/client';
import DeviceManagerPage from '@/pages/settings/device-manager';
import { setReactLocale } from '../locale';

function deviceManagerDirective(
  whenMqttReady,
  ConfigEditorProxy,
  DeviceManagerProxy,
  FwUpdateProxy,
  $state,
  SerialProxy,
  SerialPortProxy,
  SerialDeviceProxy,
  mqttClient,
  $rootScope,
) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      // Can't go to internal states directly by URL
      if ($state.current.name !== 'serial-config') {
        $state.go('serial-config', {}, { location: 'replace' });
      }

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <DeviceManagerPage
          configEditorProxy={ConfigEditorProxy}
          serialProxy={SerialProxy}
          deviceManagerProxy={DeviceManagerProxy}
          fwUpdateProxy={FwUpdateProxy}
          serialPortProxy={SerialPortProxy}
          serialDeviceProxy={SerialDeviceProxy}
          rootScope={$rootScope}
          whenMqttReady={whenMqttReady}
          mqttClient={mqttClient}
        />,
      );

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default deviceManagerDirective;
