import ReactDOM from 'react-dom/client';
import RulesPage from '@/pages/rules/index';
import { RulesStore } from '@/stores/rules';
import { setReactLocale } from '~/react-directives/locale';

// eslint-disable-next-line typescript/naming-convention
export default function rulesDirective(whenMqttReady, EditorProxy, rolesFactory) {
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
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<RulesPage rulesStore={scope.store} hasRights={hasRights} />);

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
