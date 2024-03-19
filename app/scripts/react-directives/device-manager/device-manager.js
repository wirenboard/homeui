'use strict';

import ReactDOM from 'react-dom/client';
import CreateDeviceManagerPage from './deviceManagerPage';
import { autorun } from 'mobx';
import DeviceManagerPageStore from './pageStore';
import i18n from '../../i18n/react/config';

function deviceManagerDirective(
  whenMqttReady,
  ConfigEditorProxy,
  PageState,
  rolesFactory,
  $state,
  $transitions,
  SerialProxy
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
        const response = await SerialProxy.Load({ lang: i18n.language });
        return {
          config: response.config,
          schema: response.schema,
          deviceTypeGroups: response.types,
          devicesToAdd: scope.devices,
        };
      };

      const toMobileContent = () => {
        $state.go('serial-config.properties', { hint: true });
      };
      const toTabs = () => {
        $state.go('serial-config', {}, { location: 'replace' });
      };

      const loadDeviceTypeSchema = async deviceType => {
        try {
          return await SerialProxy.GetSchema({ type: deviceType });
        } catch (err) {
          throw new Error(err.message + (err.data ? ': ' + err.data : ''));
        }
      };

      scope.store = new DeviceManagerPageStore(
        loadConfig,
        saveConfig,
        toMobileContent,
        toTabs,
        loadDeviceTypeSchema,
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
