import ReactDOM from 'react-dom/client';
import RulesPage from '@/pages/rules/index';
import { setReactLocale } from '~/react-directives/locale';

export default function rulesDirective($rootScope) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    link: function(scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<RulesPage rulesStore={$rootScope.rulesStore} />);

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
