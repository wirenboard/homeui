import ReactDOM from 'react-dom/client';
import AppsPage from '@/pages/apps';
import { setReactLocale } from '~/react-directives/locale';

export default function appsDirective() {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<AppsPage />);

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
