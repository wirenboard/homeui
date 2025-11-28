import { autorun } from 'mobx';
import ReactDOM from 'react-dom/client';
import i18n from '../../i18n/react/config';
import { setReactLocale } from '../locale';
import CreateDeviceManagerPage from './deviceManagerPage';
import DeviceManagerPageStore from './deviceManagerPageStore';

function deviceManagerDirective(
  whenMqttReady,
  ConfigEditorProxy,
  DeviceManagerProxy,
  FwUpdateProxy,
  PageState,
  rolesFactory,
  $state,
  $transitions,
  SerialProxy,
  SerialPortProxy,
  SerialDeviceProxy,
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

      if (scope.root) {
        scope.root.unmount();
      }
      if (scope.deleteTransitionHook) {
        scope.deleteTransitionHook();
      }

      // Can't go to internal states directly by URL
      if ($state.current.name !== 'serial-config') {
        $state.go('serial-config', {}, { location: 'replace' });
      }

      const path = '/usr/share/wb-mqtt-confed/schemas/wb-mqtt-serial-dummy.schema.json';
      const saveConfig = async (data) => {
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

      const stateTransitions = {
        toMobileContent: () => {
          $state.go('serial-config.properties', { hint: true });
        },
        toScan: () => {
          $state.go('serial-config.scan', { hint: true });
        },
        toTabs: () => {
          if (!$state.transition && $state.current.name === 'serial-config.properties') {
            $state.go('serial-config', {}, { location: 'replace' });
          }
        },
        onLeaveScan: (selectedDevices) => {
          $state.go('serial-config', {}, { location: 'replace' });
          if (selectedDevices) {
            scope.store.addScannedDevices(selectedDevices);
          }
        },
        onLeaveSearchDisconnectedDevice: (selectedDevice) => {
          $state.go('serial-config.properties', { hint: true }, { location: 'replace' });
          scope.store.restoreDisconnectedDevice(selectedDevice);
        },
      };

      const loadDeviceTypeSchema = async (deviceType) => {
        try {
          return await SerialProxy.GetSchema({ type: deviceType });
        } catch (err) {
          throw new Error(err.message + (err.data ? ': ' + err.data : ''));
        }
      };

      scope.store = new DeviceManagerPageStore(
        loadConfig,
        saveConfig,
        stateTransitions,
        loadDeviceTypeSchema,
        rolesFactory,
        DeviceManagerProxy,
        FwUpdateProxy,
        SerialDeviceProxy,
        SerialPortProxy
      );

      let CONFIRMATION_MSG;

      const updateTranslations = () => {
        $translate('app.prompt.serial-config-leave').then((translation) => {
          CONFIRMATION_MSG = translation;
        });
      };
      updateTranslations();
      const disposeTranslations = $rootScope.$on('$translateChangeSuccess', () => updateTranslations());

      scope.deleteTransitionHook = $transitions.onBefore({}, function (transition) {
        const from = transition.from().name;
        const to = transition.to().name;

        // Can move to scan or properties only by clicking on special buttons, not by direct URL or back button.
        // In this case, redirect to the main page
        // Button hint is used to distinguish between direct URL and button click
        if (
          from === 'serial-config' &&
          ['serial-config.properties', 'serial-config.scan'].includes(to) &&
          !transition.params('to').hint
        ) {
          return $state.target('serial-config');
        }

        // Mobile properties page, browser Back button
        if (to === 'serial-config') {
          scope.store.movedToTabsPanel();
        }

        // Scan page, browser Back button
        if (from === 'serial-config.scan' && to.startsWith('serial-config')) {
          scope.store.stopScanning();
        }

        // Confirm moving from scanning page to any page not related to device-manager
        if (
          from === 'serial-config.scan' &&
          !to.startsWith('serial-config') &&
          scope.store.shouldConfirmLeavePage()
        ) {
          if (!$window.confirm(CONFIRMATION_MSG)) {
            return false;
          }
          scope.store.stopScanning();
        }

        if (to == 'serial-config.properties') {
          if (!scope.store.inMobileMode) {
            return $state.target('serial-config');
          }
          scope.store.movedToDeviceProperties();
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
          mqttClient.addStickySubscription('/devices/+/meta/error', (msg) => {
            scope.store.setDeviceDisconnected(msg.topic, msg.payload);
          });
          mqttClient.addStickySubscription('/wb-device-manager/state', (msg) =>
            scope.store.updateScanState(msg.payload)
          );
          mqttClient.addStickySubscription('/wb-device-manager/firmware_update/state', (msg) =>
            scope.store.setEmbeddedSoftwareUpdateProgress(msg.payload)
          );
        });

      element.on('$destroy', function () {
        scope.root.unmount();
        scope.deleteTransitionHook();
        disposeTranslations();
      });
    },
  };
}

export default deviceManagerDirective;
