import type { SerialDeviceProxy as SerialDeviceProxyMethods } from '@/stores/device-manager/types';
import { exactNumberReviver } from '@/utils/exact-number';
import { createRpcProxy } from './rpc';

export const serialDeviceProxy = createRpcProxy<SerialDeviceProxyMethods>(
  'wb-mqtt-serial/device',
  [{ name: 'LoadConfig', reviver: exactNumberReviver }],
);
