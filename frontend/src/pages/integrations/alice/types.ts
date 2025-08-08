import { DeviceStore } from '@/stores/device';

export interface AlicePageParams {
  hasRights: boolean;
  deviceStore: DeviceStore;
}

export type AlicePageState = 'isLoading' | 'isConnected' | 'isNotConnected';

export interface View {
  roomId?: string;
  isNewRoom?: boolean;
  deviceId?: string;
  isNewDevice?: boolean;
}
