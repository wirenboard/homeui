import type { serialTemplatesProxy as SerialTemplatesProxyInstance } from '@/services';
import { type ConfigEditorPageStore } from './stores/config-editor-page-store';

export interface ConfigEditorPageProps {
  pageStore: ConfigEditorPageStore;
  serialTemplatesProxy: typeof SerialTemplatesProxyInstance;
  onAddWbDevice: () => void;
  onSearchDisconnectedDevice: () => void;
}
