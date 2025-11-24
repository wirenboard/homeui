import { useState } from 'react';
import { Button } from '@/components/button';
import { Tabs, useTabs } from '@/components/tabs';
import './styles.css';

export const DeviceSettingsWasm = ({ scan }) => {
  const [devices, setDevices] = useState([]);
  const { activeTab, onTabChange } = useTabs({
    defaultTab: devices[0]?.device_signature,
    items: devices,
  });

  const handleScan = async () => {
    const res = await scan();
    loadDeviceSettings(res.at(0).device_signature);
    setDevices(res);
  };

  const loadDeviceSettings = async (id: string) => {

  };

  return (
    <>
      <Button label="scan" onClick={handleScan} />
      {!!devices.length && (
        <Tabs
          items={devices.map((device) => ({ id: device.device_signature, label: device.device_signature }))}
          activeTab={activeTab}
          onTabChange={loadDeviceSettings}
        />
      )}
      {/* <DeviceManagerPage pageStore={store} />*/}
    </>
  );
};
