import ReactDOM from 'react-dom/client';
import LogsPage from '@/pages/logs';
import { LogsStore } from '@/stores/logs';
import { setReactLocale } from '~/react-directives/locale';

export default function logsDirective(whenMqttReady, LogsProxy) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new LogsStore(whenMqttReady, LogsProxy);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<LogsPage store={scope.store} />);

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
