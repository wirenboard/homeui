import classNames from 'classnames';
import { format } from 'date-fns';
import BugIcon from '@/assets/icons/bug.svg';
import { consolePanelStore } from '@/stores/console-panel';
import type { RulesStore } from '@/stores/rules';
import i18n from '~/i18n/react/config';

export const registerRulesTab = (rulesStore: RulesStore) => {
  consolePanelStore.registerTab({
    id: 'rules',
    label: i18n.t('rules-console.title'),
    getLogs: () => rulesStore.logs,
    filterLevels: [
      { value: 'all', label: i18n.t('rules-console.labels.filter-all') },
      { value: 'info', label: 'Info' },
      { value: 'warning', label: 'Warning' },
      { value: 'error', label: 'Error' },
      { value: 'debug', label: 'Debug' },
    ],
    getLogLevel: (log) => log.level,
    renderLog: (log, i) => (
      <div
        className={classNames('consolePanel-log', {
          'consolePanel-logWarn': log.level === 'warning',
          'consolePanel-logError': log.level === 'error',
          'consolePanel-logDebug': log.level === 'debug',
        })}
        tabIndex={0}
        key={i + log.time}
      >
        <time
          dateTime={new Date(log.time).toISOString()}
          className="consolePanel-logDate"
        >
          {format(log.time, 'dd-MM-yyyy HH:mm:ss')}
        </time>
        <div>{log.payload}</div>
      </div>
    ),
    actions: [
      {
        id: 'debug-toggle',
        icon: BugIcon,
        tooltip: i18n.t('rules-console.buttons.debug'),
        isActive: () => rulesStore.isRuleDebugEnabled,
        onClick: () => rulesStore.toggleRuleDebugging(),
      },
    ],
    clearLogs: () => rulesStore.clearLogs(),
    closable: false,
  });
};
