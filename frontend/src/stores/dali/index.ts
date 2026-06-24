import { BusStore } from './bus-store';
import { DaliGlobalStore } from './dali-global-store';
import { DeviceStore } from './device-store';
import { GatewayStore } from './gateway-store';
import { GroupStore } from './group-store';

export { BusCommandsStore } from './bus-commands-store';
export { DaliPageStore } from './dali-page-store';
export { MonitorStore } from './monitor-store';

export type ItemStore = GatewayStore | BusStore | DeviceStore | GroupStore;

export const daliGlobalStore = new DaliGlobalStore();

export { DaliGlobalStore, GatewayStore, BusStore, DeviceStore, GroupStore };
