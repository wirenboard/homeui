import ReactDOM from 'react-dom/client';
import { RulesConsole } from '@/components/rules-console';
import { setReactLocale } from '~/react-directives/locale';

export default function rulesConsoleDirective($rootScope) {
  'ngInject';
  setReactLocale();

  return {
    restrict: 'E',
    link: function (scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);

      $rootScope.$watch(
        () => $rootScope.consoleVisible,
        (isOpened) => {
          scope.root.render(
            isOpened
              ? (
                <RulesConsole
                  toggleConsole={$rootScope.toggleConsole}
                  changeConsoleView={$rootScope.changeConsoleView}
                  rulesStore={$rootScope.rulesStore}
                />
              )
              : null
          );
        }
      );

      element.on('$destroy', ()=> {
        scope.root.unmount();
      });
    },
  };
}
