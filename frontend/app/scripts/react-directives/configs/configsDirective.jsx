import ReactDOM from 'react-dom/client';
import { setReactLocale } from '~/react-directives/locale';
import ConfigsPage from '@/pages/settings/configs/index/';

export default function configsDirective($rootScope) {
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
        <ConfigsPage store={$rootScope.configsStore}/>
      );

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
