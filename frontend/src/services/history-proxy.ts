import type { LoadHistoryResponse } from '@/stores/history/types';
import { createRpcProxy } from './rpc';

interface HistoryProxyMethods {
  get_values: (params: Record<string, any>) => Promise<LoadHistoryResponse>;
}

export const historyProxy = createRpcProxy<HistoryProxyMethods>(
  'db_logger/history',
  ['get_values'],
);
