import ReactDOM from 'react-dom/client';
import EditRulePage from '@/pages/rules/[rule]';
import { setReactLocale } from '~/react-directives/locale';

export default function ruleDirective($rootScope) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function(scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <EditRulePage
          rulesStore={$rootScope.rulesStore}
          devicesStore={$rootScope.devicesStore}
        />
      );

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
