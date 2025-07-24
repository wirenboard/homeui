import ReactDOM from 'react-dom/client';
import AlicePage from '@/pages/integrations/alice';
import { DeviceStore } from '@/stores/device';
import { setReactLocale } from '~/react-directives/locale';

export default function aliceDirective(rolesFactory, mqttClient) {
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

      scope.deviceStore = new DeviceStore(mqttClient);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<AlicePage hasRights={hasRights} deviceStore={scope.deviceStore}/>);

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
