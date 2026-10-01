import type { SerialPortProxy as SerialPortProxyMethods } from '@/stores/device-manager/types';
import { createRpcProxy } from './rpc';

export const serialPortProxy = createRpcProxy<SerialPortProxyMethods>(
  'wb-mqtt-serial/port',
  ['Setup'],
);
