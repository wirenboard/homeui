import ReactDOM from 'react-dom/client';
import MqttChannelsPage from '@/pages/settings/mqtt-channels';
import { setReactLocale } from '~/react-directives/locale';

export default function mqttChannels($rootScope) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<MqttChannelsPage store={$rootScope.deviceStore} />);

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
