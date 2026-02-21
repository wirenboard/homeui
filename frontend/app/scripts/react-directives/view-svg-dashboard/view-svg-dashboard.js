import ReactDOM from 'react-dom/client';
import SvgDashboardPage, { SvgDashboardPageStore } from '@/pages/dashboards/svg/[slug]';
import { setReactLocale } from '~/react-directives/locale';

export default function svgDashboardDirective($rootScope) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {
      id: '=',
    },
    link: function(scope, element) {
      scope.store = new SvgDashboardPageStore();
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <SvgDashboardPage
          store={scope.store}
          dashboardsStore={$rootScope.dashboardsStore}
          devicesStore={$rootScope.deviceStore}
        />
      );

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}
