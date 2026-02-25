import ReactDOM from 'react-dom/client';
import WidgetsPage from '@/pages/dashboards/widgets';
import { setReactLocale } from '~/react-directives/locale';

export default function widgetsDirective($rootScope) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function(scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <WidgetsPage
          store={$rootScope.dashboardsStore}
          devicesStore={$rootScope.devicesStore}
        />
      );

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
