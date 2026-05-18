import ReactDOM from 'react-dom/client';
import { ExposeCheck, ExposeCheckStore } from '@/components/expose-check';
import { setReactLocale } from '../locale';

export default function expCheckMetaDirective(mqttClient, whenMqttReady) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new ExposeCheckStore(mqttClient, whenMqttReady);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<ExposeCheck store={scope.store} />);

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
