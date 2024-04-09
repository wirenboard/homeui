'use strict';

import ReactDOM from 'react-dom/client';
import CreateCloudStatusMetaWidget from './cloudStatusMetaWidget';
import CloudStatusMetaStore from "./meta-store";

function cloudStatusMetaDirective(mqttClient, whenMqttReady) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {},
    link(scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new CloudStatusMetaStore(mqttClient, whenMqttReady);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateCloudStatusMetaWidget({ store: scope.store }));

      whenMqttReady().then(() => {
        mqttClient.addStickySubscription('/devices/system__wb-cloud-agent/providers', msg => {
          scope.store.updateProviderList(msg.payload);
        });
      });

      element.on('$destroy', () => {
        scope.root.unmount();
      });
    },
  };
}

export default cloudStatusMetaDirective;
