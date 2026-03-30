import { DaliStore } from './dali-store';
import { MonitorStore } from './monitor-store';
import { GatewayStore } from './gateway-store';
import { BusStore } from './bus-store';
import { DeviceStore } from './device-store';
import { GroupStore } from './group-store';
  
export type ItemStore = GatewayStore | BusStore | DeviceStore | GroupStore;
  
export {
    DaliStore,
    GatewayStore,
    BusStore,
    DeviceStore,
    GroupStore,
    MonitorStore
};
