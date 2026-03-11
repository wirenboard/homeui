import ReactDOM from 'react-dom/client';
import EditSvgDashboardPage from '@/pages/dashboards/svg/[slug]/edit';
import { setReactLocale } from '../locale';

export default function editSvgDashboardDirective(
  mqttClient,
  $state,
  $rootScope,
) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {
      id: '=',
    },
    link: function (scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <EditSvgDashboardPage
          dashboardsStore={$rootScope.dashboardsStore}
          devicesStore={$rootScope.devicesStore}
          openPage={(id, params) => $state.go(id, params)}
        />
      );

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}
