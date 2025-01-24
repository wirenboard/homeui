'use strict';

import ReactDOM from 'react-dom/client';
import CreateUsersPage from './usersPage';
import UsersStore from './pageStore';
import { setReactLocale } from '../locale';

function usersDirective(rolesFactory) {
  'ngInject';

  setReactLocale();
  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      scope.store = new UsersStore(rolesFactory);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateUsersPage({ store: scope.store }));

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default usersDirective;
