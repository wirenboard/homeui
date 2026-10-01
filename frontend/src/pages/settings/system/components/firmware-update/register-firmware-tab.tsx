import i18n from '@/i18n/config';
import { consolePanelStore } from '@/stores/console-panel';
import { FirmwareConsoleContent, FirmwareConsoleToolbar } from './firmware-console-tab';
import type { FirmwareUpdateStore } from './store';

export function registerFirmwareTab(store: FirmwareUpdateStore) {
  consolePanelStore.registerTab({
    id: 'firmware-update',
    label: i18n.t('system.update.title'),
    renderToolbar: () => <FirmwareConsoleToolbar store={store} />,
    renderContent: () => <FirmwareConsoleContent store={store} />,
    closable: true,
  });
}

export function showFirmwareTab() {
  consolePanelStore.show('firmware-update');
}
