import ReactDOM from 'react-dom/client';
import WebUiSettingsPage from '@/pages/web-ui-settings';
import { setReactLocale } from '~/react-directives/locale';

export default function webUiSettingsDirective(uiConfig, rolesFactory, $translate, tmhDynamicLocale) {
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

      const onChangeDefaultDashboard = (dashboardId) => {
        uiConfig.setDefaultDashboard(dashboardId);
      };

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render((
        <WebUiSettingsPage
          whenUIConfigReady={uiConfig.whenReady}
          onChangeLanguage={onChangeLang}
          onChangeDefaultDashboard={onChangeDefaultDashboard}
        />
      ));

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
