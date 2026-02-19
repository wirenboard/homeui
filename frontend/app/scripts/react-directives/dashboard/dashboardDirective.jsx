import ReactDOM from 'react-dom/client';
import DashboardPage from '@/pages/dashboards/[slug]';
import { setReactLocale } from '~/react-directives/locale';

export default function dashboardDirective($rootScope, $stateParams) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {
      id: '=',
    },
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      $rootScope.isHMI = $stateParams.hmi;
      $rootScope.forceFullscreen = $stateParams.fullscreen === true;
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <DashboardPage
          dashboardsStore={$rootScope.dashboardsStore}
          devicesStore={$rootScope.deviceStore}
        />
      );

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
