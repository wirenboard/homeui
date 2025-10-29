import ReactDOM from 'react-dom/client';
import RulesPage from '@/pages/rules/index';
import { setReactLocale } from '~/react-directives/locale';

export default function rulesDirective($rootScope, rolesFactory) {
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
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<RulesPage rulesStore={$rootScope.rulesStore} hasRights={hasRights} />);

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
