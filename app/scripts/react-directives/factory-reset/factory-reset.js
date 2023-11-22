'use strict';

import ReactDOM from 'react-dom/client';
import CreateFactoryResetWidget from './factoryResetWidget';
import FactoryResetStore from './store';

function factoryResetDirective(mqttClient, whenMqttReady) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new FactoryResetStore();
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateFactoryResetWidget({ store: scope.store }));

      whenMqttReady().then(() => {
        mqttClient.addStickySubscription('/firmware/status', function (msg) {
          scope.store.updateStatus(msg.payload);
        });

        mqttClient.addStickySubscription('/firmware/log', function (msg) {
          scope.store.updateLog(msg.payload);
        });

        mqttClient.addStickySubscription('/firmware/progress', function (msg) {
          scope.store.updateProgress(msg.payload);
        });
      });

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default factoryResetDirective;
