'use strict';

import ReactDOM from 'react-dom/client';
import CreateDeviceManagerPage from './deviceManagerPage';
import { autorun } from 'mobx';
import DeviceManagerPageStore from './pageStore';

function deviceManagerDirective(whenMqttReady, ConfigEditorProxy, PageState, rolesFactory) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {
      devices: '=',
    },
    link: function (scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      const path = '/var/lib/wb-mqtt-confed/schemas/wb-mqtt-serial.schema.json';
      const saveConfig = async data => {
        await ConfigEditorProxy.Save({ path: path, content: data });
      };
      const loadConfig = async () => {
        const r = await ConfigEditorProxy.Load({ path: path });
        return { config: r.content, schema: r.schema, devices: scope.devices };
      };

      scope.store = new DeviceManagerPageStore(loadConfig, saveConfig, rolesFactory);
      autorun(() => {
        PageState.setDirty(scope.store.isDirty);
      });
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateDeviceManagerPage({ pageStore: scope.store }));
      whenMqttReady().then(() => scope.store.load());

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default deviceManagerDirective;
