import ReactDOM from 'react-dom/client';
import WebUiSettingsPage from '@/pages/settings/web-ui';
import { setReactLocale } from '~/react-directives/locale';

export default function webUiSettingsDirective(
  $rootScope,
  rolesFactory,
  $translate,
  tmhDynamicLocale
) {
  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      const onChangeLang = (lang) => {
        $translate.use(lang);
        tmhDynamicLocale.set(lang);
        setReactLocale();
      };

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render((
        <WebUiSettingsPage
          dashboardsStore={$rootScope.dashboardsStore}
          userType={rolesFactory.current.roles.type}
          onChangeLanguage={onChangeLang}
        />
      ));

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
