import ReactDOM from 'react-dom/client';
import DaliPage from '@/pages/settings/configs/dali';
import { DaliStore } from '@/stores/dali';
import { setReactLocale } from '~/react-directives/locale';

export default function daliDirective(whenMqttReady, DaliProxy, mqttClient) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new DaliStore(whenMqttReady, DaliProxy, mqttClient);

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <DaliPage store={scope.store} />
      );

      element.on('$destroy', () => {
        scope.store.destroy();
        scope.root.unmount();
      });
    },
  };
}
