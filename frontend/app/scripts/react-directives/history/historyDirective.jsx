import ReactDOM from 'react-dom/client';
import HistoryPage from '@/pages/history';
import { setReactLocale } from '~/react-directives/locale';

export default function historyDirective($rootScope, HistoryProxy, $state) {
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
        <HistoryPage
          historyProxy={HistoryProxy}
          dashboardsStore={$rootScope.dashboardsStore}
          devicesStore={$rootScope.devicesStore}
          $state={$state}
        />
      );

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
