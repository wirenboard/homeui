import { type ConfigEditorPageStore } from './stores/config-editor-page-store';

export interface ConfigEditorPageProps {
  pageStore: ConfigEditorPageStore;
  onAddWbDevice: () => void;
  onSearchDisconnectedDevice: () => void;
}
