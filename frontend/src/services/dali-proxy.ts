import type { DaliProxy as DaliProxyBase } from '@/stores/dali/types';
import { createRpcProxy } from './rpc';

export const daliProxy = createRpcProxy<DaliProxyBase>(
  'wb-mqtt-dali/Editor',
  [
    'GetList',
    'GetGateway',
    'SetGateway',
    'GetBus',
    'SetBus',
    'ScanBus',
    'StopScanBus',
    'GetDevice',
    'SetDevice',
    'GetGroup',
    'SetGroup',
    'IdentifyDevice',
    'ResetDeviceSettings',
    'ResetDevice',
  ],
);
