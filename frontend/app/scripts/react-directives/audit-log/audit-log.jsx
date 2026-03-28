import ReactDOM from 'react-dom/client';
import AuditLogPage from '@/pages/settings/audit-log';
import { setReactLocale } from '../locale';

function auditLogDirective() {
  'ngInject';
  setReactLocale();
  return {
    restrict: 'E',
    scope: {},
    link: function(scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(<AuditLogPage />);
      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default auditLogDirective;
