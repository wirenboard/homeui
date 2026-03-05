import ReactDOM from 'react-dom/client';
import DevicesPage from '@/pages/devices';
import { setReactLocale } from '~/react-directives/locale';

export default function devicesDirective($rootScope) {
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
      scope.root.render(<DevicesPage store={$rootScope.devicesStore} />);

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
