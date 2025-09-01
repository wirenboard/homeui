import ReactDOM from 'react-dom/client';
import DashboardPage from '@/pages/dashboards/[slug]';
import { DashboardsStore } from '@/stores/dashboards';
import { DeviceStore } from '@/stores/device';
import { setReactLocale } from '~/react-directives/locale';

export default function dashboardDirective($rootScope, $stateParams, uiConfig, mqttClient, ConfigEditorProxy) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      $rootScope.isHMI = $stateParams.hmi;
      $rootScope.forceFullscreen = $stateParams.fullscreen === true;

      scope.dashboardStore = new DashboardsStore(uiConfig, ConfigEditorProxy);
      scope.devicesStore = new DeviceStore(mqttClient);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <DashboardPage
          dashboardStore={scope.dashboardStore}
          devicesStore={scope.devicesStore}
        />
      );

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
