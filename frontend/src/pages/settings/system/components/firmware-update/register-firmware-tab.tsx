import { consolePanelStore } from '@/stores/console-panel';
import i18n from '~/i18n/react/config';
import type { FirmwareUpdateStore } from './store';

export function registerFirmwareTab(store: FirmwareUpdateStore) {
  consolePanelStore.registerTab({
    id: 'firmware-update',
    label: i18n.t('system.update.title'),
    getLogs: () => store.logRows,
    renderLog: (logLine: string, i: number) => (
      <div className="consolePanel-logPlain" key={i}>
        {logLine}
      </div>
    ),
    clearLogs: () => store.clearLog(),
    closable: true,
  });
}

export function showFirmwareTab() {
  consolePanelStore.show('firmware-update');
}
