import ReactDOM from 'react-dom/client';
import AlicePage from '@/pages/integrations/alice';
import { DeviceStore } from '@/stores/device';
import { setReactLocale } from '~/react-directives/locale';

export default function aliceDirective(mqttClient) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function(scope, element) {
      scope.deviceStore = new DeviceStore(mqttClient);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<AlicePage deviceStore={scope.deviceStore}/>);

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
