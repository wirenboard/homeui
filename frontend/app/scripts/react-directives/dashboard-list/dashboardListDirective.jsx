import ReactDOM from 'react-dom/client';
import DashboardListPage from '@/pages/dashboards/index';
import { setReactLocale } from '~/react-directives/locale';

export default function dashboardListDirective($rootScope) {
  'ngInject';
  setReactLocale();

  return {
    restrict: 'E',
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<DashboardListPage dashboardsStore={$rootScope.dashboardsStore} />);

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
