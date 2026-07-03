import i18n from '@/i18n/config';
import { consolePanelStore } from '@/stores/console-panel';
import { RulesConsoleContent, RulesConsoleToolbar } from './rules-console-tab';

export const registerRulesTab = () => {
  consolePanelStore.registerTab({
    id: 'rules',
    label: i18n.t('rules-console.title'),
    renderToolbar: () => <RulesConsoleToolbar />,
    renderContent: () => <RulesConsoleContent />,
    closable: false,
  });
};
