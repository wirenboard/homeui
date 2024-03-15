'use strict';

import ReactDOM from 'react-dom/client';
import CreateDeviceManagerPage from './deviceManagerPage';
import { autorun } from 'mobx';
import DeviceManagerPageStore from './pageStore';

function deviceManagerDirective(
  whenMqttReady,
  ConfigEditorProxy,
  PageState,
  rolesFactory,
  $state,
  $transitions
) {
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
      if (scope.deleteTransitionHook) {
        scope.deleteTransitionHook();
      }

      const path = '/var/lib/wb-mqtt-confed/schemas/wb-mqtt-serial.schema.json';
      const saveConfig = async data => {
        await ConfigEditorProxy.Save({ path: path, content: data });
      };
      const loadConfig = async () => {
        const r = await ConfigEditorProxy.Load({ path: path });
        return { config: r.content, schema: r.schema, devices: scope.devices };
      };

      const toMobileContent = () => {
        $state.go('serial-config.properties', { hint: true });
      };
      const toTabs = () => {
        $state.go('serial-config', {}, { location: 'replace' });
      };

      scope.store = new DeviceManagerPageStore(
        loadConfig,
        saveConfig,
        toMobileContent,
        toTabs,
        rolesFactory
      );

      scope.deleteTransitionHook = $transitions.onBefore({}, function (transition) {
        if (
          transition.to().name == 'serial-config' &&
          transition.from().name == 'serial-config.properties'
        ) {
          scope.store.tabs.mobileModeStore.movedToTabsPanel();
          return true;
        }
        if (
          transition.from().name == 'serial-config' &&
          transition.to().name == 'serial-config.properties' &&
          !transition.params('to').hint
        ) {
          return $state.target('serial-config');
        }
        return true;
      });

      autorun(() => {
        PageState.setDirty(scope.store.isDirty);
      });
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateDeviceManagerPage({ pageStore: scope.store }));
      whenMqttReady().then(() => scope.store.load());

      element.on('$destroy', function () {
        scope.root.unmount();
        scope.deleteTransitionHook();
      });
    },
  };
}

export default deviceManagerDirective;
