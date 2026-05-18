import ReactDOM from 'react-dom/client';
import MbGatePage from '@/pages/settings/configs/mbgate';
import { setReactLocale } from '../locale';

export default function mbGateDirective($rootScope) {
  'ngInject';

  setReactLocale();
  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <MbGatePage
          configsStore={$rootScope.configsStore}
          devicesStore={$rootScope.devicesStore}
          rootScope={$rootScope}
        />
      );

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}
