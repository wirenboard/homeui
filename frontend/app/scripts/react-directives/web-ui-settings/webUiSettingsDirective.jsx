import ReactDOM from 'react-dom/client';
import WebUiSettingsPage from '@/pages/settings/web-ui';
import { setReactLocale } from '~/react-directives/locale';

export default function webUiSettingsDirective($rootScope, $translate, tmhDynamicLocale) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
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
          onChangeLanguage={onChangeLang}
        />
      ));

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
