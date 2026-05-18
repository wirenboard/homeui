import ReactDOM from 'react-dom/client';
import SvgDashboardPage, { SvgDashboardPageStore } from '@/pages/dashboards/svg/[slug]/index';
import { setReactLocale } from '~/react-directives/locale';

export default function svgDashboardDirective($rootScope, $stateParams) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {
      id: '=',
    },
    link: function(scope, element) {
      scope.store = new SvgDashboardPageStore($rootScope.dashboardsStore, $rootScope.devicesStore);
      scope.root = ReactDOM.createRoot(element[0]);

      $rootScope.$watch(() => $stateParams.hmi, (isHmi) => {
        $rootScope.isHMI = !!isHmi;
      });

      scope.root.render(
        <SvgDashboardPage store={scope.store} />
      );

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}
