import ReactDOM from 'react-dom/client';
import { Navigation } from '@/components/navigation';
import { setReactLocale } from '~/react-directives/locale';

export default function navigationDirective($rootScope) {
  'ngInject';
  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <Navigation
          toggleConsole={$rootScope.toggleConsole}
          dashboardsStore={$rootScope.dashboardsStore}
        />
      );

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
