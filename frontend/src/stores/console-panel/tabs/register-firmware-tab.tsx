import type { FirmwareUpdateStore } from '@/pages/settings/system/components/firmware-update/store';
import { consolePanelStore } from '../index';
import i18n from '~/i18n/react/config';

export function registerFirmwareTab(store: FirmwareUpdateStore) {
  consolePanelStore.registerTab({
    id: 'firmware-update',
    label: i18n.t('system.update.title'),
    logs: store.logRows,
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

export function unregisterFirmwareTab() {
  consolePanelStore.unregisterTab('firmware-update');
}
