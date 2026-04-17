import { BusStore } from './bus-store';
import { DaliStore } from './dali-store';
import { DeviceStore } from './device-store';
import { GatewayStore } from './gateway-store';
import { GroupStore } from './group-store';
import { MonitorStore } from './monitor-store';

export type ItemStore = GatewayStore | BusStore | DeviceStore | GroupStore;

export {
  DaliStore,
  GatewayStore,
  BusStore,
  DeviceStore,
  GroupStore,
  MonitorStore
};
