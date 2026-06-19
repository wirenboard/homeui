import classNames from 'classnames';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import BugIcon from '@/assets/icons/bug.svg';
import ClearIcon from '@/assets/icons/clear.svg';
import { ConsoleIconButton } from '@/components/console-panel/console-icon-button';
import { ConsoleLogScroller } from '@/components/console-panel/console-log-scroller';
import { Dropdown, type Option } from '@/components/dropdown';
import { rulesStore } from '@/stores/rules/index';

export const RulesConsoleToolbar = observer(() => {
  const { t } = useTranslation();
  const levelOptions: Option[] = [
    { value: 'all', label: t('rules-console.labels.filter-all') },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
    { value: 'debug', label: 'Debug' },
  ];

  return (
    <>
      <ConsoleIconButton
        icon={BugIcon}
        tooltip={t('rules-console.buttons.debug')}
        active={rulesStore.isRuleDebugEnabled}
        onClick={() => rulesStore.toggleRuleDebugging()}
      />
      <ConsoleIconButton
        icon={ClearIcon}
        tooltip={t('console-panel.buttons.clear')}
        onClick={() => rulesStore.clearLogs()}
      />
      <div className="consolePanel-separatorLeft">
        <Dropdown
          className="consolePanel-filter"
          options={levelOptions}
          value={rulesStore.logLevelFilter}
          size="small"
          onChange={({ value }: Option<string>) => rulesStore.setLogLevelFilter(value)}
        />
      </div>
    </>
  );
});

export const RulesConsoleContent = observer(() => {
  const filter = rulesStore.logLevelFilter;
  const logs = filter === 'all'
    ? rulesStore.logs
    : rulesStore.logs.filter((log) => log.level === filter);

  return (
    <ConsoleLogScroller scrollKey={logs.length}>
      {logs.map((log, i) => (
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
      ))}
    </ConsoleLogScroller>
  );
});
