import { type Boot, type LoadLogsParams } from '@/stores/logs';
import { createRpcProxy } from './rpc';

interface LogsListResult {
  boots: Boot[];
  services: string[];
}

interface LogsProxyMethods {
  Load: (params: LoadLogsParams) => Promise<any[]>;
  List: () => Promise<LogsListResult>;
  CancelLoad: () => Promise<void>;
}

export const logsProxy = createRpcProxy<LogsProxyMethods>(
  'wb_logs/logs',
  ['Load', 'List', 'CancelLoad'],
);
