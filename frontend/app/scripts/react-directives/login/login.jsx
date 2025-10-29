import ReactDOM from 'react-dom/client';
import LoginPage from '@/pages/login/login';
import { setReactLocale } from '../locale';

function loginPageDirective(rolesFactory, $state, $translate, tmhDynamicLocale) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      const onChangeLocale = (lang) => {
        $translate.use(lang);
        tmhDynamicLocale.set(lang);
        setReactLocale();
      };

      const onSuccessLogin = (userType) => {
        rolesFactory.setRole(userType);
        rolesFactory.setUsersAreConfigured(true);
        rolesFactory.setCurrentUserIsAutologinUser(false);

        const search = new URLSearchParams($state.params.returnParams);
        const returnParams = {};
        for (const [key, value] of search.entries()) {
          returnParams[key] = value;
        }

        $state.go($state.params.returnState || 'home', returnParams, { location: 'replace' });
      };

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <LoginPage
          onSuccessLogin={onSuccessLogin}
          onChangeLocale={onChangeLocale}
        />
      );

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}

export default loginPageDirective;
