import type { SerialDeviceProxy as SerialDeviceProxyMethods } from '@/stores/device-manager/types';
import { createRpcProxy } from './rpc';

export const serialDeviceProxy = createRpcProxy<SerialDeviceProxyMethods>(
  'wb-mqtt-serial/device',
  ['LoadConfig'],
);
