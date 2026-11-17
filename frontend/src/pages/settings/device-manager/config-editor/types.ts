import type { serialTemplatesProxy as SerialTemplatesProxyInstance } from '@/services';
import { type ConfigEditorPageStore } from './stores/config-editor-page-store';

export interface ConfigEditorPageProps {
  pageStore: ConfigEditorPageStore;
  serialTemplatesProxy: typeof SerialTemplatesProxyInstance;
  onAddWbDevice: () => void;
  onSearchDisconnectedDevice: () => void;
}

export interface ApplyProblemDevice {
  port: string;
  slave_id: string;
}

export interface ApplyProblems {
  disabled_devices: ApplyProblemDevice[];
  unread_devices: ApplyProblemDevice[];
  invalid_devices: ApplyProblemDevice[];
}

export type TemplateErrorClassification =
  | { kind: 'template-in-use' }
  | { kind: 'apply-problems'; problems: ApplyProblems }
  | { kind: 'other' };
