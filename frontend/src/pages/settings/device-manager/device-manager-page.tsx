import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
import { serialConfiPath } from '@/common/paths';
import { usePreventLeavePage } from '@/utils/prevent-page-leave';
import { useStore } from '@/utils/use-store';
import i18n from '~/i18n/react/config';
import ConfigEditorPage from './config-editor';
import { DeviceManagerPageStore } from './device-manager-page-store';
import ScanPage from './scan';
import type { DeviceManagerPageProps, StateTransitions } from './types';

const DeviceManagerPage = observer(({
  configEditorProxy,
  serialProxy,
  deviceManagerProxy,
  fwUpdateProxy,
  serialPortProxy,
  serialDeviceProxy,
  rootScope,
  whenMqttReady,
  mqttClient,
}: DeviceManagerPageProps) => {
  const isMobile = useMediaQuery({ maxWidth: 991 });

  const store = useStore(() => {
    let storeInstance: DeviceManagerPageStore;

    const loadConfig = async () => {
      const response = await serialProxy.Load({ lang: i18n.language });
      return {
        config: response.config,
        schema: response.schema,
        deviceTypeGroups: response.types,
      };
    };

    const saveConfig = async (content: any) => {
      await configEditorProxy.Save({ path: serialConfiPath, content });
    };

    const loadDeviceTypeSchema = async (deviceType: string) => {
      try {
        return await serialProxy.GetSchema({ type: deviceType });
      } catch (err: any) {
        throw new Error(err.message + (err.data ? ': ' + err.data : ''));
      }
    };

    const stateTransitions: StateTransitions = {
      toMobileContent: () => {},
      toScan: () => {},
      toTabs: () => {},
      onLeaveScan: (selectedDevices) => {
        if (selectedDevices) {
          storeInstance.addScannedDevices(selectedDevices);
        }
      },
      onLeaveSearchDisconnectedDevice: (selectedDevice) => {
        storeInstance.restoreDisconnectedDevice(selectedDevice);
      },
    };

    storeInstance = new DeviceManagerPageStore(
      loadConfig,
      saveConfig,
      stateTransitions,
      loadDeviceTypeSchema,
      deviceManagerProxy,
      fwUpdateProxy,
      serialDeviceProxy,
      serialPortProxy,
    );

    return storeInstance;
  });
  const isScanning = store.shouldConfirmLeavePage();
  const confirmMessage = isScanning
    ? i18n.t('device-manager.prompt.prevent-leave')
    : i18n.t('common.prompt.dirty');
  const { setIsDirty } = usePreventLeavePage(rootScope, confirmMessage);

  useEffect(() => {
    store.setMobileMode(isMobile);
  });

  useEffect(() => {
    setIsDirty(store.isDirty || isScanning);
  }, [store.isDirty, isScanning]);

  useEffect(() => {
    whenMqttReady()
      .then(() => {
        return store.loadConfig();
      })
      .then(() => {
        mqttClient.addStickySubscription('/devices/+/meta/error', (msg: any) => {
          store.setDeviceDisconnected(msg.topic, msg.payload);
        });
        mqttClient.addStickySubscription('/wb-device-manager/state', (msg: any) =>
          store.updateScanState(msg.payload),
        );
        mqttClient.addStickySubscription('/wb-mqtt-serial/firmware_update/state', (msg: any) =>
          store.setEmbeddedSoftwareUpdateProgress(msg.payload),
        );
      });
  }, []);

  if (store.newDevicesScanPageStore.active || store.searchDisconnectedScanPageStore.active) {
    const scanType = store.newDevicesScanPageStore.active ? 'new' : 'disconnected';
    return (
      <ScanPage
        scanType={scanType}
        pageStore={scanType === 'new' ? store.newDevicesScanPageStore : store.searchDisconnectedScanPageStore}
      />
    );
  }

  return (
    <ConfigEditorPage
      pageStore={store.configEditorPageStore}
      onAddWbDevice={() => store.addWbDevice()}
      onSearchDisconnectedDevice={() => store.searchDisconnectedDevice()}
    />
  );
});

export default DeviceManagerPage;
