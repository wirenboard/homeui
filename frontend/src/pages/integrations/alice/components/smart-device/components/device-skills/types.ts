import type { SmartDeviceCapability, SmartDeviceProperty } from '@/stores/alice';
import { DeviceStore } from '@/stores/device';

export interface DeviceSkillsParams {
  capabilities: SmartDeviceCapability[];
  properties: SmartDeviceProperty[];
  deviceStore: DeviceStore;
  onCapabilityChange: (_data: SmartDeviceCapability[]) => void;
  onPropertyChange: (_data: SmartDeviceProperty[]) => void;
}
