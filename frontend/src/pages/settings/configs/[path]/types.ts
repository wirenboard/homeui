import { type ConfigsStore } from '@/stores/configs';
import { type DevicesStore } from '@/stores/devices';

export interface ConfigPageProps {
  transitions: any;
  store: ConfigsStore;
  devicesStore: DevicesStore;
}
