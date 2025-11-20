import { type RulesStore } from '@/stores/rules';

export interface RulesConsoleProps {
  rulesStore: RulesStore;
  toggleConsole: () => void;
  changeConsoleView: (_view: 'bottom' | 'right') => void;
}
