import ReactDOM from 'react-dom/client';
import EditRulePage from '@/pages/rules/[rule]';
import { DeviceStore } from '@/stores/device';
import { RulesStore } from '@/stores/rules';
import { setReactLocale } from '~/react-directives/locale';

// eslint-disable-next-line typescript/naming-convention
export default function ruleDirective(whenMqttReady, mqttClient, EditorProxy, rolesFactory) {
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
      scope.store = new RulesStore(whenMqttReady, EditorProxy);
      scope.devicesStore = new DeviceStore(mqttClient);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <EditRulePage
          rulesStore={scope.store}
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
