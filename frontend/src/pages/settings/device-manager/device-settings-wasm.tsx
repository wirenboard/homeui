import { useState } from 'react';
import { Button } from '@/components/button';
import { Tabs, useTabs } from '@/components/tabs';
import { PageLayout } from '@/layouts/page';
import { DeviceTabStore, DeviceTypesStore } from '@/stores/device-manager/';
import { Translator } from '@/stores/json-schema-editor';
import { DeviceSettingsEditor } from './components/device-settings-editor/device-settings-editor';

export const DeviceSettingsWasm = ({ scan, loadConfig, configGetSchema, configGetDeviceTypes }) => {
  const [devices, setDevices] = useState([]);
  const [tabstore, setTabstore] = useState(null);
  const { activeTab, onTabChange } = useTabs({
    defaultTab: devices[0]?.device_signature,
    items: devices,
  });

  const handleScan = async () => {
    const res = await scan();
    setDevices(res);
  };

  const loadDeviceSettings = async (id: string) => {
    const deviceTypesStore = new DeviceTypesStore(configGetSchema);
    const configDeviceTypes = await configGetDeviceTypes();

    deviceTypesStore.setDeviceTypeGroups(configDeviceTypes.result);
    const deviceTypes = deviceTypesStore.findNotDeprecatedDeviceTypes(
      devices[0].device_signature,
      devices[0].fw?.version
    );

    const initialData = {
      slave_id: devices[0].cfg.slave_id,
    };

    const store = new DeviceTabStore(initialData, deviceTypes.at(0), deviceTypesStore);
    await store.loadContent(devices[0].cfg)
    setTabstore(store);
  };

  const translator = new Translator();

  return (
    <PageLayout
      title="Web Serial"
      actions={
        <>
          <Button label="Select port" onClick={handleScan} />
        </>
      }
      isLoading={false}
      hasRights
    >

      {!!devices.length && (
        <Tabs
          items={devices.map((device) => ({ id: device.device_signature, label: device.device_signature }))}
          activeTab={activeTab}
          onTabChange={loadDeviceSettings}
        />
      )}
      {tabstore && <DeviceSettingsEditor store={tabstore} translator={translator} />}
    </PageLayout>
  );
};
