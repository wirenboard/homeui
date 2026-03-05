import { type SmartDeviceCapability, type SmartDeviceProperty } from '@/stores/alice';
import { type DevicesStore } from '@/stores/devices';

export interface DeviceSkillsProps {
  capabilities: SmartDeviceCapability[];
  properties: SmartDeviceProperty[];
  devicesStore: DevicesStore;
  onCapabilityChange: (_data: SmartDeviceCapability[]) => void;
  onPropertyChange: (_data: SmartDeviceProperty[]) => void;
}

export interface DeviceCapabilitiesProps {
  capabilities: SmartDeviceCapability[];
  devicesStore: DevicesStore;
  onCapabilityChange: (capabilities: SmartDeviceCapability[]) => void;
}

export interface DevicePropertiesProps {
  properties: SmartDeviceProperty[];
  devicesStore: DevicesStore;
  onPropertyChange: (properties: any[]) => void;
}
