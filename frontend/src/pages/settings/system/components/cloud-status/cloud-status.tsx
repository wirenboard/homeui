import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { ButtonLink } from '@/components/button';
import { Card } from '@/components/card';
import { useStore } from '@/utils/use-store';
import { CloudStatusMetaStore } from './meta-store';
import { Status } from './status';
import type CloudStatusStore from './store';
import { type CloudStatusProps } from './types';
import './styles.css';

export const CloudStatus = observer(({ className }: CloudStatusProps) => {
  const { t } = useTranslation();
  const store = useStore(() => new CloudStatusMetaStore());

  return Object.values(store.stores).map((store: CloudStatusStore) => store.initialized ? (
    <Card
      heading={`${t('system.cloud-status.title')} ${store.provider}`}
      variant="secondary"
      className={className}
      key={store.provider}
    >
      {store.activationLink === null ? (
        <>
          <Status status={store.status} />
          <ButtonLink
            to={store.cloudLink}
            label={t('system.cloud-status.goto-cloud')}
            className="cloudStatus-button"
            variant="secondary"
            target="_blank"
          />
        </>
      ) : (
        <Alert variant="info" withIcon={false} size="small">
          {t('system.cloud-status.activation-link-preamble')}{' '}
          <a href={store.activationLink} target="_blank" rel="noreferrer">
            {t('system.cloud-status.activation-link')}
          </a>
        </Alert>
      )}
    </Card>
  ) : null);
});
