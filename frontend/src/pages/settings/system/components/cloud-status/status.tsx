import { observer } from 'mobx-react-lite';
import { lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { ConnectionStatus } from './store';
import './styles.css';

const RefreshIcon = lazy(() => import('@/assets/icons/refresh.svg'));

export const Status = observer(({ status }: { status: ConnectionStatus }) => {
  const { t } = useTranslation();

  if (status === ConnectionStatus.Connected) {
    return (
      <Alert variant="success" size="small">
        {t('system.cloud-status.status-ok')}
      </Alert>
    );
  }
  if (status === ConnectionStatus.Starting) {
    return (
      <Alert className="cloudStatus-alert" variant="warn" size="small" icon={RefreshIcon}>
        {t('system.cloud-status.status-starting')}
      </Alert>
    );
  }
  if (status === ConnectionStatus.Connecting) {
    return (
      <Alert className="cloudStatus-alert" variant="warn" size="small" icon={RefreshIcon}>
        {t('system.cloud-status.status-connecting')}
      </Alert>
    );
  }
  if (status === ConnectionStatus.Stopped) {
    return (
      <Alert className="cloudStatus-alert" variant="danger" size="small" icon={RefreshIcon}>
        {t('system.cloud-status.status-stopped')}
      </Alert>
    );
  }
  return (
    <Alert variant="danger" size="small">
      {t('system.cloud-status.status-error')}: {status}
    </Alert>
  );
});
