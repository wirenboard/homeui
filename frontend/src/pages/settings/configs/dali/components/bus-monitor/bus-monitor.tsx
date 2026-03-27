import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/switch';
import { Tooltip } from '@/components/tooltip';
import ClearIcon from '@/assets/icons/clear.svg';
import VisibilityOff from '@/assets/icons/visibility-off.svg';
import VisibilityOn from '@/assets/icons/visibility.svg';
import { type BusMonitorProps } from './types';
import './styles.css';

export const BusMonitor = observer(({ monitorStore, busMonitorEnabled, onToggle }: BusMonitorProps) => {
  const { t } = useTranslation();
  const content = useRef<HTMLDivElement>(null);
  const [isStopAutoScroll, setIsStopAutoScroll] = useState(false);

  const handleScroll = useCallback(() => {
    const { scrollHeight, scrollTop, clientHeight } = content.current;

    const atBottom = scrollHeight - scrollTop - clientHeight < 5;
    setIsStopAutoScroll(!atBottom);
  }, [content.current]);

  useEffect(() => {
    if (content.current && !isStopAutoScroll) {
      content.current.scrollTo({ top: content.current.scrollHeight });
    }
  }, [isStopAutoScroll, monitorStore.logs.length, content.current]);

  return (
    <div>
      <div className="dali-busMonitorHeader">
        <label className="dali-busMonitorToggle">
          <Switch
            value={busMonitorEnabled}
            ariaLabel={t('dali.labels.bus-monitor')}
            onChange={onToggle}
          />
          <span>{t('dali.labels.bus-monitor')}</span>
        </label>
        {busMonitorEnabled && (
          <>
            <Tooltip text={t('dali.buttons.clear-log')}>
              <button className="rulesConsole-button" onClick={() => monitorStore.clearLogs()}>
                <ClearIcon className="rulesConsole-icon"/>
              </button>
            </Tooltip>
            <Tooltip text={t(monitorStore.isOnPause ? 'dali.buttons.resume-log' : 'dali.buttons.pause-log')}>
              <button className="rulesConsole-button" onClick={() => monitorStore.toggleLogsReception()}>
                {monitorStore.isOnPause ? <VisibilityOn className="rulesConsole-icon"/> : <VisibilityOff className="rulesConsole-icon"/>}
              </button>
            </Tooltip>
          </>
        )}
      </div>
      {busMonitorEnabled && (
        <div
          className="dali-busMonitorContent"
          ref={content}
          onScroll={handleScroll}
        >
          {monitorStore.logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
});
