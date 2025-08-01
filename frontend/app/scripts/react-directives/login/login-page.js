import ReactDOM from 'react-dom/client';
import { setReactLocale } from '../locale';
import CreateLoginPage from './loginPage';
import LoginPageStore from './store';

function loginPageDirective(rolesFactory, $state) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      const autologin = rolesFactory.currentUserIsAutologinUser;

      const onSuccess = () => {
        $state.go('home');
        if (autologin) {
          location.reload();
        }
      };

      const onCancel = () => {
        $state.go('home');
      };

      scope.store = new LoginPageStore(
        rolesFactory,
        onSuccess,
        rolesFactory.currentUserIsAutologinUser ? onCancel : null
      );
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateLoginPage({ store: scope.store }));

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}

export default loginPageDirective;
