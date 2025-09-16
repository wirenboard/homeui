import ReactDOM from 'react-dom/client';
import WebUiSettingsPage from '@/pages/settings/web-ui';
import { DashboardsStore } from '@/stores/dashboards';
import { setReactLocale } from '~/react-directives/locale';

export default function webUiSettingsDirective(ConfigEditorProxy, rolesFactory, $translate, tmhDynamicLocale) {
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

      scope.dashboardStore = new DashboardsStore(ConfigEditorProxy);

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render((
        <WebUiSettingsPage
          dashboardStore={scope.dashboardStore}
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
