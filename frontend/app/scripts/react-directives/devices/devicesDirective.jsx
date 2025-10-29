import ReactDOM from 'react-dom/client';
import DevicesPage from '@/pages/devices';
import { DeviceStore } from '@/stores/device';
import { setReactLocale } from '~/react-directives/locale';

export default function devicesDirective(mqttClient) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new DeviceStore(mqttClient);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<DevicesPage store={scope.store} />);

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
