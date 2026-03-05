import { type DevicesStore } from '@/stores/devices';

export interface AlicePageProps {
  devicesStore: DevicesStore;
}

export type AlicePageState = 'isLoading' | 'isConnected' | 'isNotConnected';

export interface View {
  roomId?: string;
  isNewRoom?: boolean;
  deviceId?: string;
  isNewDevice?: boolean;
}
