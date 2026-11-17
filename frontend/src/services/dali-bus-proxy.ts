import type { DaliBusProxy as DaliBusProxyMethods } from '@/stores/dali/types';
import { createRpcProxy } from './rpc';

export const daliBusProxy = createRpcProxy<DaliBusProxyMethods>(
  'wb-mqtt-dali/Bus',
  ['SendCommand', 'ListCommands'],
);
