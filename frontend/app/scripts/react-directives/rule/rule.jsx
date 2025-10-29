import ReactDOM from 'react-dom/client';
import EditRulePage from '@/pages/rules/[rule]';
import { DeviceStore } from '@/stores/device';
import { setReactLocale } from '~/react-directives/locale';

export default function ruleDirective($rootScope, mqttClient) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    link: function(scope, element) {
      scope.devicesStore = new DeviceStore(mqttClient);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <EditRulePage
          rulesStore={$rootScope.rulesStore}
          devicesStore={scope.devicesStore}
        />
      );

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
