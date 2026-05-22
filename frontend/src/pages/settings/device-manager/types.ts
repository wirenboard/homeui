import type {
  DeviceManagerProxyProxy,
  FwUpdateProxy,
  ScannedDevice,
  SerialDeviceProxy,
  SerialPortProxy,
} from '@/stores/device-manager/types';

export interface DeviceManagerPageProps {
  configEditorProxy: any;
  serialProxy: any;
  deviceManagerProxy: DeviceManagerProxyProxy;
  fwUpdateProxy: FwUpdateProxy;
  serialPortProxy: SerialPortProxy;
  serialDeviceProxy: SerialDeviceProxy;
  rootScope: any;
  mqttClient: any;
  whenMqttReady: () => Promise<void>;
}

export interface StateTransitions {
  toMobileContent: () => void;
  toScan: () => void;
  toTabs: () => void;
  onLeaveScan: (_selectedDevices: ScannedDevice[]) => void;
  onLeaveSearchDisconnectedDevice: (_selectedDevice?: Partial<ScannedDevice>) => void;
}
