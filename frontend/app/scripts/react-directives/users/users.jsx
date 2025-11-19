import ReactDOM from 'react-dom/client';
import UsersPage from '@/pages/settings/users/usersPage';
import { setReactLocale } from '../locale';

function usersDirective() {
  'ngInject';

  setReactLocale();
  return {
    restrict: 'E',
    scope: {},
    link: function(scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<UsersPage />);

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default usersDirective;
