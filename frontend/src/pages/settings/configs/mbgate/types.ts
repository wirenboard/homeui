import { type ConfigsStore } from '@/stores/configs';
import { type DevicesStore } from '@/stores/devices';

export interface MbGatePageProps {
  configsStore: ConfigsStore;
  devicesStore: DevicesStore;
  rootScope: any;
}
