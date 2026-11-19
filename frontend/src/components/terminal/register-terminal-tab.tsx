import i18n from '@/i18n/config';
import { authStore, UserRole } from '@/stores/auth';
import { consolePanelStore } from '@/stores/console-panel';
import { terminalStore } from './terminal-store';
import { TerminalContent } from './terminal-tab';

export const registerTerminalTab = () => {
  authStore.onLogout(() => terminalStore.forgetSession());

  if (!authStore.hasRights(UserRole.Admin)) {
    return;
  }

  consolePanelStore.registerTab({
    id: 'terminal',
    label: i18n.t('terminal.title'),
    renderContent: () => <TerminalContent />,
    closable: false,
  });
};
