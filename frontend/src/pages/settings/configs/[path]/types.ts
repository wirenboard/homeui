import { type ConfigsStore } from '@/stores/configs';
import { type DevicesStore } from '@/stores/devices';

export interface ConfigPageProps {
  rootScope: any;
  store: ConfigsStore;
  devicesStore: DevicesStore;
}
