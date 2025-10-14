import ReactDOM from 'react-dom/client';
import { Navigation } from '@/components/navigation';
import { setReactLocale } from '~/react-directives/locale';

export default function navigationDirective($rootScope, mqttClient) {
  'ngInject';
  setReactLocale();

  return {
    restrict: 'E',
    link: function (scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <Navigation
          mqttClient={mqttClient}
          toggleConsole={$rootScope.toggleConsole}
          dashboardsStore={$rootScope.dashboardsStore}
          rulesStore={$rootScope.rulesStore}
        />
      );

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
