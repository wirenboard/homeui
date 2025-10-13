import ReactDOM from 'react-dom/client';
import DashboardPage from '@/pages/dashboards/[slug]';
import { DeviceStore } from '@/stores/device';
import { setReactLocale } from '~/react-directives/locale';

export default function dashboardDirective(
  $rootScope,
  $stateParams,
  mqttClient,
  rolesFactory
) {
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
      $rootScope.isHMI = $stateParams.hmi;
      $rootScope.forceFullscreen = $stateParams.fullscreen === true;
      scope.devicesStore = new DeviceStore(mqttClient);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <DashboardPage
          dashboardsStore={$rootScope.dashboardsStore}
          devicesStore={scope.devicesStore}
          hasEditRights={hasEditRights}
        />
      );

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
