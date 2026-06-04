import { createRpcProxy } from './rpc';

interface DeviceManagerStartParams {
  scan_type: 'extended' | 'standard' | 'bootloader';
  preserve_old_results: boolean;
  port?: { path: string; protocol: 'modbus' | 'modbus-tcp' };
  out_of_order_slave_ids?: string[];
}

interface DeviceManagerProxyMethods {
  Start: (params: DeviceManagerStartParams) => Promise<void>;
  Stop: () => Promise<void>;
}

export const deviceManagerProxy = createRpcProxy<DeviceManagerProxyMethods>(
  'wb-device-manager/bus-scan',
  ['Start', 'Stop'],
);
