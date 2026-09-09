import i18n from '@/i18n/config';
import { authStore, UserRole } from '@/stores/auth';
import { consolePanelStore } from '@/stores/console-panel';
import { TerminalContent, TerminalToolbar } from './terminal-tab';

export const registerTerminalTab = () => {
  if (!authStore.hasRights(UserRole.Admin)) {
    return;
  }

  consolePanelStore.registerTab({
    id: 'terminal',
    label: i18n.t('terminal.title'),
    renderToolbar: () => <TerminalToolbar />,
    renderContent: () => <TerminalContent />,
    closable: false,
  });
};
