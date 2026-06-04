import type { RuleFetchData, RuleListItem, RuleSaveData } from '@/stores/rules/types';
import { createRpcProxy } from './rpc';

interface EditorProxyMethods {
  ChangeState: (params: { path: string; state: boolean }) => Promise<void>;
  List: () => Promise<RuleListItem[]>;
  Load: (params: { path: string }) => Promise<RuleFetchData>;
  Save: (params: { path: string; content: string }) => Promise<RuleSaveData>;
  Remove: (params: { path: string }) => Promise<boolean>;
  Rename: (params: { path: string; new_path: string }) => Promise<void>;
}

export const editorProxy = createRpcProxy<EditorProxyMethods>(
  'wbrules/Editor',
  ['ChangeState', 'List', 'Load', 'Save', 'Remove', 'Rename'],
);
