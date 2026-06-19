import { type SmartDeviceCapability, type SmartDeviceProperty } from '@/stores/alice';

export interface DeviceSkillsProps {
  capabilities: SmartDeviceCapability[];
  properties: SmartDeviceProperty[];
  onCapabilityChange: (_data: SmartDeviceCapability[]) => void;
  onPropertyChange: (_data: SmartDeviceProperty[]) => void;
}

export interface DeviceCapabilitiesProps {
  capabilities: SmartDeviceCapability[];
  onCapabilityChange: (capabilities: SmartDeviceCapability[]) => void;
}

export interface DevicePropertiesProps {
  properties: SmartDeviceProperty[];
  onPropertyChange: (properties: any[]) => void;
}

export interface CapabilitySubProps {
  capability: SmartDeviceCapability;
  index: number;
  capabilities: SmartDeviceCapability[];
  onCapabilityChange: (capabilities: SmartDeviceCapability[]) => void;
}

export interface PropertySubProps {
  property: SmartDeviceProperty;
  index: number;
  properties: SmartDeviceProperty[];
  onPropertyChange: (properties: SmartDeviceProperty[]) => void;
}
