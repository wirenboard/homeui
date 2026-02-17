import ReactDOM from 'react-dom/client';
import WidgetsPage from '@/pages/dashboards/widgets';
import { DeviceStore } from '@/stores/device';
import { setReactLocale } from '~/react-directives/locale';

export default function widgetsDirective($rootScope, mqttClient) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function(scope, element) {
      scope.devicesStore = new DeviceStore(mqttClient);

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <WidgetsPage
          store={$rootScope.dashboardsStore}
          devicesStore={scope.devicesStore}
        />
      );

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
