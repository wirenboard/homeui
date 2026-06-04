import type { ScannedDevice } from '@/stores/device-manager/types';

export interface StateTransitions {
  toMobileContent: () => void;
  toScan: () => void;
  toTabs: () => void;
  onLeaveScan: (_selectedDevices: ScannedDevice[]) => void;
  onLeaveSearchDisconnectedDevice: (_selectedDevice?: Partial<ScannedDevice>) => void;
}
