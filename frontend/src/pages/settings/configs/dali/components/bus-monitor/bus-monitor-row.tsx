import classNames from 'classnames';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ParsedBusMonitorLine } from '@/stores/dali/types';
import './styles.css';

/** Splits a hex string into space-separated bytes: 'a3fa' → 'a3 fa', '01fe43' → '01 fe 43'. */
const formatHexBytes = (hex: string) => hex.match(/.{1,2}/g)?.join(' ') ?? hex;

/**
 * A single parsed DALI bus monitor line, rendered as a column row. Receives an
 * already-parsed frame (the content component parses each line once and shares
 * it with the address filter); memoised on the raw line so unchanged rows skip
 * re-rendering as new entries arrive.
 */
export const BusMonitorRow = memo(({ frame }: { frame: ParsedBusMonitorLine }) => {
  const { t } = useTranslation();
  const { direction, response, badges } = frame;

  return (
    <div className={classNames('daliMonitor-row', { 'daliMonitor-rowError': response.kind === 'error' })}>
      <span className="daliMonitor-time">{frame.time}</span>
      <span className="daliMonitor-hex">{formatHexBytes(frame.hex)}</span>
      <span className="daliMonitor-command">
        <span className="daliMonitor-cmdText" title={frame.command}>{frame.command}</span>
        {direction === 'in' && (
          <span className="daliMonitor-srcBadge" title={t('dali.labels.monitor-foreign')}>
            <span className="daliMonitor-srcBadgeLabel">{t('dali.labels.monitor-foreign')}</span>
            {badges.fc !== undefined && <span className="daliMonitor-srcBadgeNum">{badges.fc}</span>}
          </span>
        )}
        {badges.fromLunatone && <span className="daliMonitor-badge">lunatone</span>}
      </span>
      <span className="daliMonitor-response">
        {response.kind === 'error' && (
          <span className="daliMonitor-statusError" title={response.text}>{response.text}</span>
        )}
        {response.kind === 'value' && (
          <span className="daliMonitor-value" title={response.text}>
            {response.hex && <span className="daliMonitor-valueHex">{formatHexBytes(response.hex)}</span>}
            <span className="daliMonitor-valueNum">{response.value}</span>
          </span>
        )}
      </span>
    </div>
  );
}, (prev, next) => prev.frame.raw === next.frame.raw);

/** Sticky column header for the bus monitor tab. */
export const BusMonitorHeader = () => {
  const { t } = useTranslation();
  return (
    <div className="daliMonitor-row daliMonitor-headerRow">
      <span className="daliMonitor-time">{t('dali.labels.monitor-col-time')}</span>
      <span className="daliMonitor-hex">{t('dali.labels.monitor-col-hex')}</span>
      <span className="daliMonitor-command">{t('dali.labels.monitor-col-command')}</span>
      <span className="daliMonitor-response">{t('dali.labels.monitor-col-response')}</span>
    </div>
  );
};
