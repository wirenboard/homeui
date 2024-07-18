'use strict';

import ReactDOM from 'react-dom/client';
import { autorun } from 'mobx';
import CreateDeviceManagerPage from './deviceManagerPage';
import DeviceManagerPageStore from './deviceManagerPageStore';
import i18n from '../../i18n/react/config';
import { setReactLocale } from '../locale';

function deviceManagerDirective(
  whenMqttReady,
  ConfigEditorProxy,
  DeviceManagerProxy,
  PageState,
  rolesFactory,
  $state,
  $transitions,
  SerialProxy,
  SerialPortProxy,
  mqttClient,
  $rootScope,
  $window,
  $translate
) {
  'ngInject';

  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      $rootScope.noConsole = true;

      if (scope.root) {
        scope.root.unmount();
      }
      if (scope.deleteTransitionHook) {
        scope.deleteTransitionHook();
      }

      const path = '/usr/share/wb-mqtt-confed/schemas/wb-mqtt-serial-dummy.schema.json';
      const saveConfig = async data => {
        await ConfigEditorProxy.Save({ path: path, content: data });
      };

      const loadConfig = async () => {
        const response = await SerialProxy.Load({ lang: i18n.language });
        return {
          config: response.config,
          schema: response.schema,
          deviceTypeGroups: response.types,
        };
      };

      const setupPort = deviceCfg => {
        return SerialPortProxy.Setup(deviceCfg);
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

      const startScan = (extended, portPath) => {
        let params = {
          scan_type: extended ? 'extended' : 'standard',
          preserve_old_results: false,
        };
        if (portPath) {
          params.port = { path: portPath };
        }
        return DeviceManagerProxy.Start(params);
      };
      const stopScan = () => DeviceManagerProxy.Stop();

      scope.store = new DeviceManagerPageStore(
        loadConfig,
        saveConfig,
        toMobileContent,
        toTabs,
        loadDeviceTypeSchema,
        rolesFactory,
        startScan,
        stopScan,
        setupPort
      );

      let CONFIRMATION_MSG;

      const updateTranslations = () => {
        $translate('app.prompt.serial-config-leave').then(translation => {
          CONFIRMATION_MSG = translation;
        });
      };
      updateTranslations();
      $rootScope.$on('$translateChangeSuccess', () => updateTranslations());

      scope.deleteTransitionHook = $transitions.onBefore({}, function (transition) {
        if (
          transition.to().name == 'serial-config' &&
          transition.from().name == 'serial-config.properties'
        ) {
          scope.store.movedToTabsPanel();
          return true;
        }
        if (
          transition.from().name == 'serial-config' &&
          transition.to().name == 'serial-config.properties' &&
          !transition.params('to').hint
        ) {
          return $state.target('serial-config');
        }
        if (transition.from().name == 'serial-config' && scope.store.shouldConfirmLeavePage()) {
          if (!$window.confirm(CONFIRMATION_MSG)) {
            return false;
          }
          scope.store.stopScanning();
        }
        return true;
      });

      autorun(() => {
        PageState.setDirty(scope.store.isDirty);
      });
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateDeviceManagerPage({ pageStore: scope.store }));
      whenMqttReady()
        .then(() => {
          return scope.store.loadConfig();
        })
        .then(() => {
          mqttClient.addStickySubscription('/devices/+/meta/error', msg => {
            scope.store.setDeviceDisconnected(msg.topic, msg.payload);
          });
          return DeviceManagerProxy.hasMethod('Start');
        })
        .then(available => {
          if (available) {
            scope.store.setDeviceManagerAvailable();
            mqttClient.addStickySubscription('/wb-device-manager/state', msg =>
              scope.store.updateScanState(msg.payload)
            );
          } else {
            scope.store.setDeviceManagerUnavailable();
          }
        })
        .catch(() => {
          scope.store.setDeviceManagerUnavailable();
        });

      element.on('$destroy', function () {
        scope.root.unmount();
        scope.deleteTransitionHook();
        $rootScope.noConsole = false;
      });
    },
  };
}

export default deviceManagerDirective;
