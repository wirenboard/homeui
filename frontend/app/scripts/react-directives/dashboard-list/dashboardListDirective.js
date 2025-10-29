import ReactDOM from 'react-dom/client';
import DashboardListPage from '@/pages/dashboards/index';
import { setReactLocale } from '~/react-directives/locale';

export default function dashboardListDirective($rootScope, rolesFactory) {
  'ngInject';
  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      const hasEditRights = rolesFactory.current.role !== rolesFactory.ROLE_ONE;
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <DashboardListPage
          dashboardsStore={$rootScope.dashboardsStore}
          hasEditRights={hasEditRights}
        />
      );

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
