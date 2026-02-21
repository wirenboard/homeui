import ReactDOM from 'react-dom/client';
import AlicePage from '@/pages/integrations/alice';
import { setReactLocale } from '~/react-directives/locale';

export default function aliceDirective($rootScope) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function(scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<AlicePage deviceStore={$rootScope.deviceStore} />);

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
