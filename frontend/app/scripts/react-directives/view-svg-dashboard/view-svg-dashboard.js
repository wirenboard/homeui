import ReactDOM from 'react-dom/client';
import SvgDashboardPage, { SvgDashboardPageStore } from '@/pages/dashboards/svg/[slug]';
import { DeviceStore } from '@/stores/device';
import { setReactLocale } from '~/react-directives/locale';

export default function svgDashboardDirective(mqttClient, $rootScope) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {
      id: '=',
    },
    link: function(scope, element) {
      scope.store = new SvgDashboardPageStore();
      scope.devicesStore = new DeviceStore(mqttClient);

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <SvgDashboardPage
          store={scope.store}
          dashboardsStore={$rootScope.dashboardsStore}
          devicesStore={scope.devicesStore}
        />
      );

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}
