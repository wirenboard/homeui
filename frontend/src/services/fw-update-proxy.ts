import type {
  FwUpdateProxyClearErrorParams,
  FwUpdateProxyGetFirmwareInfoParams,
  FwUpdateProxyGetFirmwareInfoResult,
  FwUpdateProxyRestoreParams,
  FwUpdateProxyUpdateParams,
} from '@/stores/device-manager/types';
import { createRpcProxy } from './rpc';

interface FwUpdateProxyMethods {
  GetFirmwareInfo: (params: FwUpdateProxyGetFirmwareInfoParams) => Promise<FwUpdateProxyGetFirmwareInfoResult>;
  Update: (params: FwUpdateProxyUpdateParams) => Promise<void>;
  ClearError: (params: FwUpdateProxyClearErrorParams) => Promise<void>;
  Restore: (params: FwUpdateProxyRestoreParams) => Promise<void>;
}

export const fwUpdateProxy = createRpcProxy<FwUpdateProxyMethods>(
  'wb-mqtt-serial/fw-update',
  ['GetFirmwareInfo', 'Update', 'ClearError', 'Restore'],
);
