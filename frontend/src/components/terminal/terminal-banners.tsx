import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { terminalStore } from './terminal-store';
import { type TerminalBannerProps, TerminalCloseCode } from './types';

const STOP_TEXT_KEYS: Record<TerminalCloseCode, string> = {
  [TerminalCloseCode.SessionFinished]: 'terminal.stopped.session-finished',
  [TerminalCloseCode.SlotTaken]: 'terminal.stopped.slot-taken',
  [TerminalCloseCode.TakenOver]: 'terminal.stopped.taken-over',
};

const TerminalBanner = ({ variant, text, actionLabel, onAction }: TerminalBannerProps) => (
  <Alert className="terminal-banner" variant={variant} size="small">
    <div className="terminal-bannerBody">
      <span className="terminal-bannerText">{text}</span>
      <Button
        className="terminal-bannerAction"
        size="small"
        variant="secondary"
        label={actionLabel}
        onClick={onAction}
      />
    </div>
  </Alert>
);

export const TerminalNoticePanel = observer(() => {
  const { t } = useTranslation();
  const { notice } = terminalStore;

  if (!notice) {
    return null;
  }

  return (
    <TerminalBanner
      variant="info"
      text={t(`terminal.notice.${notice.kind}`)}
      actionLabel={t('terminal.buttons.open-here')}
      onAction={terminalStore.openNoticeSession}
    />
  );
});

export const TerminalReconnectBanner = observer(() => {
  const { t } = useTranslation();

  if (!terminalStore.isReconnecting) {
    return null;
  }

  return (
    <TerminalBanner
      variant="warn"
      text={t('terminal.reconnecting')}
      actionLabel={t('terminal.buttons.reconnect-now')}
      onAction={terminalStore.connect}
    />
  );
});

export const TerminalStopBanner = observer(() => {
  const { t } = useTranslation();
  const { stopCode, sessionId } = terminalStore;

  if (!stopCode) {
    return null;
  }

  return (
    <TerminalBanner
      variant={stopCode === TerminalCloseCode.SessionFinished ? 'gray' : 'warn'}
      text={t(STOP_TEXT_KEYS[stopCode])}
      actionLabel={t(sessionId ? 'terminal.buttons.reconnect' : 'terminal.buttons.new-session')}
      onAction={terminalStore.connect}
    />
  );
});
