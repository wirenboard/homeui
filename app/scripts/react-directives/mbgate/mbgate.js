'use strict';

import { autorun } from 'mobx';
import ReactDOM from 'react-dom/client';
import CreateMbGateSettingsPage from './mbgatePage';
import MbGateStore from './pageStore';
import { setReactLocale } from '../locale';

function mbGateDirective(whenMqttReady, ConfigEditorProxy, PageState, rolesFactory, DeviceData) {
  'ngInject';

  setReactLocale();
  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      if (scope.root) {
        scope.root.unmount();
      }

      const path = '/usr/share/wb-mqtt-confed/schemas/wb-mqtt-mbgate2.schema.json';
      const saveConfig = async data => {
        await ConfigEditorProxy.Save({ path: path, content: data });
      };

      scope.store = new MbGateStore(rolesFactory, DeviceData, saveConfig);
      autorun(() => {
        PageState.setDirty(scope.store.isDirty);
      });
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateMbGateSettingsPage({ pageStore: scope.store }));

      whenMqttReady().then(() => {
        ConfigEditorProxy.Load({ path: path })
          .then(r => {
            scope.configPath = r.configPath;
            scope.store.setSchemaAndData(r.schema, r.content);
          })
          .catch(err => {
            scope.store.setError(err.message);
          });
      });

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default mbGateDirective;
