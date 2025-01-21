'use strict';

import ReactDOM from 'react-dom/client';
import CreateLoginModal from './loginModal';
import LoginModalStore from './store';
import { setReactLocale } from '../locale';

function loginModalDirective(rolesFactory) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {
      show: '=',
      httpWarning: '=',
    },
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new LoginModalStore(scope.show, rolesFactory, scope.httpWarning);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateLoginModal({ store: scope.store }));

      scope.$watch('show', newValue => {
        if (newValue === true) {
          scope.store.show();
        }
      });

      scope.$watch('httpWarning', newValue => {
        scope.store.setHttpWarning(newValue);
      });

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}

export default loginModalDirective;
