import { useState } from 'react';
import { Button } from '@/components/button';
import { Tabs, useTabs } from '@/components/tabs';
import { PageLayout } from '@/layouts/page';
import DeviceTypesStore from '~/scripts/react-directives/device-manager/common/deviceTypesStore';
import { DeviceTab } from '~/scripts/react-directives/device-manager/config-editor/deviceTabStore';
import { Translator } from '../../../stores/json-schema-editor';
import { DeviceSettingsEditor } from './device-settings-editor';

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
    const qwerty = await configGetDeviceTypes();
    const deviceTypesStore = new DeviceTypesStore(configGetSchema);

    deviceTypesStore.setDeviceTypeGroups(qwerty.result);

    // TODO подтянуть ветку
    // передать настройки порта
    // await deviceTypesStore.loadContent(devices[0].cfg)
    const deviceTypes = deviceTypesStore.findNotDeprecatedDeviceTypes(
      devices[0].device_signature,
      devices[0].fw?.version
    );

    const initialData = {
      slave_id: devices[0].cfg.slave_id,
    };

    const store = new DeviceTab(initialData, deviceTypes, deviceTypesStore);
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
