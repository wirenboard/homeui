import { BusCommandsStore } from './bus-commands-store';
import { BusStore } from './bus-store';
import { DaliGlobalStore } from './dali-global-store';
import { DaliPageStore } from './dali-page-store';
import { DeviceStore } from './device-store';
import { GatewayStore } from './gateway-store';
import { GroupStore } from './group-store';
import { MonitorStore } from './monitor-store';

export type ItemStore = GatewayStore | BusStore | DeviceStore | GroupStore;

export const daliGlobalStore = new DaliGlobalStore();

export {
  DaliGlobalStore,
  DaliPageStore,
  GatewayStore,
  BusStore,
  BusCommandsStore,
  DeviceStore,
  GroupStore,
  MonitorStore
};
