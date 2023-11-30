'use strict';

import ReactDOM from 'react-dom/client';
import CreateFirmwareUpdateWidget from './firmwareUpdateWidget';
import FirmwareUpdateStore from './store';

function firmwareUpdateDirective(mqttClient, whenMqttReady) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {
      id: '@',
    },
    link: function (scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new FirmwareUpdateStore(scope.id === 'reset');
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateFirmwareUpdateWidget({ store: scope.store }));

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

        mqttClient.addStickySubscription('/firmware/fits/factoryreset/present', function (msg) {
          scope.store.factoryResetFitsState.setFactoryResetFitPresent(msg.payload);
        });

        mqttClient.addStickySubscription('/firmware/fits/factoryreset/compatibility', function (msg) {
          scope.store.factoryResetFitsState.setFactoryResetFitCompatibility(msg.payload);
        });

        mqttClient.addStickySubscription('/firmware/fits/factoryreset-original/present', function (msg) {
          scope.store.factoryResetFitsState.setFactoryResetOriginalFitPresent(msg.payload);
        });

        mqttClient.addStickySubscription('/firmware/fits/factoryreset-original/compatibility', function (msg) {
          scope.store.factoryResetFitsState.setFactoryResetOriginalFitCompatibility(msg.payload);
        });
      });

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default firmwareUpdateDirective;
