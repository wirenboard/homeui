'use strict';

import ReactDOM from 'react-dom/client';
import CreateExpCheckWidget from './expCheckWidget';
import ExpCheckStore from './store';
import { setReactLocale } from '../locale';

function expCheckMetaDirective(mqttClient, whenMqttReady) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new ExpCheckStore(mqttClient, whenMqttReady);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateExpCheckWidget({ store: scope.store }));

      whenMqttReady().then(() => {
        fetch('/api/check');
        mqttClient.addStickySubscription('/rpc/v1/exp-check', msg => {
          try {
            let payload = JSON.parse(msg.payload);
            scope.store.update(payload.result, payload.details);
          } catch (e) {}
        });
      });

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}

export default expCheckMetaDirective;
