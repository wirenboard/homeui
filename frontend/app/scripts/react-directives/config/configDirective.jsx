import ReactDOM from 'react-dom/client';
import ConfigPage from '@/pages/settings/configs/[path]';
import { setReactLocale } from '~/react-directives/locale';

export default function configDirective($rootScope) {
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
      scope.root.render(
        <ConfigPage
          store={$rootScope.configsStore}
          rootScope={$rootScope}
          devicesStore={$rootScope.devicesStore}
        />
      );

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
