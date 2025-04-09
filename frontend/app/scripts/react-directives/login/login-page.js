import ReactDOM from 'react-dom/client';
import { setReactLocale } from '../locale';
import CreateLoginPage from './loginPage';
import LoginPageStore from './store';

function loginPageDirective(rolesFactory, $rootScope, $state) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      $rootScope.noConsole = true;
      $rootScope.disableNavigation = true;

      if (scope.root) {
        scope.root.unmount();
      }

      const onSuccess = () => {
        $state.go('home');
      };

      scope.store = new LoginPageStore(rolesFactory, onSuccess);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateLoginPage({ store: scope.store }));

      element.on('$destroy', () => {
        scope.root.unmount();
        $rootScope.noConsole = false;
        $rootScope.disableNavigation = false;
      });
    },
  };
}

export default loginPageDirective;
