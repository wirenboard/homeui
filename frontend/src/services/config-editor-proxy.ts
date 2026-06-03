import type { Config, ConfigListItem } from '@/stores/configs/types';
import { createRpcProxy } from './rpc';

interface ConfigEditorProxyMethods {
  List: () => Promise<ConfigListItem[]>;
  Load: (params: { path: string }) => Promise<Config>;
  Save: (params: { path: string; content: any }) => Promise<void>;
}

export const configEditorProxy = createRpcProxy<ConfigEditorProxyMethods>(
  'confed/Editor',
  ['List', 'Load', 'Save'],
);
