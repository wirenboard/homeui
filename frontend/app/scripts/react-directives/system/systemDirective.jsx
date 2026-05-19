import ReactDOM from 'react-dom/client';
import SystemPage from '@/pages/settings/system';
import { setReactLocale } from '~/react-directives/locale';

export default function systemDirective(mqttClient, whenMqttReady, DiagnosticProxy) {
  'ngInject';
  setReactLocale();

  return {
    restrict: 'E',
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <SystemPage
          mqttClient={mqttClient}
          whenMqttReady={whenMqttReady}
          diagnosticProxy={DiagnosticProxy}
        />
      );

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}
