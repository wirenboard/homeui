import ReactDOM from 'react-dom/client';
import NetworkConnectionsPage from '@/pages/settings/network-connections';
import { NetworkConnectionsPageStore } from '@/pages/settings/network-connections/stores/page-store';
import { setReactLocale } from '../locale';

export default function networkConnectionsDirective(mqttClient, whenMqttReady, ConfigEditorProxy, $rootScope) {
  'ngInject';

  setReactLocale();
  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new NetworkConnectionsPageStore(mqttClient, whenMqttReady, ConfigEditorProxy);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<NetworkConnectionsPage store={scope.store} rootScope={$rootScope} />);

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}
