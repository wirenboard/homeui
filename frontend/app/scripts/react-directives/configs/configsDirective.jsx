import ReactDOM from 'react-dom/client';
import { setReactLocale } from '~/react-directives/locale';
import ConfigsPage from '@/pages/settings/configs';
import { ConfigsStore } from '@/stores/configs';

export default function configsDirective(whenMqttReady, ConfigEditorProxy) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new ConfigsStore(whenMqttReady, ConfigEditorProxy);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <ConfigsPage store={scope.store}/>
      );

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
