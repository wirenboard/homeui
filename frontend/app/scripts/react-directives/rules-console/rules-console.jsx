import { autorun } from 'mobx';
import ReactDOM from 'react-dom/client';
import { ConsolePanel } from '@/components/console-panel';
import { consolePanelStore } from '@/stores/console-panel';
import { setReactLocale } from '~/react-directives/locale';

export default function rulesConsoleDirective($rootScope) {
  'ngInject';
  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);

      const onPositionChange = (pos) => {
        $rootScope.consoleView = pos;
        $rootScope.$applyAsync();
      };

      const dispose = autorun(() => {
        const isVisible = consolePanelStore.isVisible;
        scope.root.render(
          isVisible
            ? (
              <ConsolePanel
                store={consolePanelStore}
                onPositionChange={onPositionChange}
              />
            )
            : null
        );
      });

      element.on('$destroy', () => {
        dispose();
        scope.root.unmount();
      });
    },
  };
}
