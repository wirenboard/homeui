import ReactDOM from 'react-dom/client';
import EditRulePage from '@/pages/rules/[rule]';
import { DeviceStore } from '@/stores/device';
import { setReactLocale } from '~/react-directives/locale';

export default function ruleDirective($rootScope, mqttClient, rolesFactory) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {
      path: '=',
      isNew: '=',
    },
    link: function (scope, element) {
      const hasRights = rolesFactory.checkRights(rolesFactory.ROLE_THREE);
      scope.devicesStore = new DeviceStore(mqttClient);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <EditRulePage
          rulesStore={$rootScope.rulesStore}
          devicesStore={scope.devicesStore}
          hasRights={hasRights}
        />
      );

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
