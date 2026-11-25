import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Card } from '@/components/card';
import type { PasskeysViewProps } from './types';

export const PasskeysList = ({ rows, onDelete }: PasskeysViewProps) => {
  const { t } = useTranslation();

  return (
    <div className="passkeys-list">
      {rows.map(({ credential, domain, createdAt, lastUsedAt }) => (
        <Card
          key={credential.id}
          className="passkeys-card"
          heading={credential.name}
          variant="secondary"
          actions={[{
            title: t('users.buttons.delete-passkey'),
            icon: TrashIcon,
            action: () => onDelete(credential),
          }]}
        >
          <dl className="passkeys-cardData">
            <dt>{t('users.labels.passkey-domain')}</dt>
            <dd>{domain}</dd>
            <dt>{t('users.labels.passkey-created')}</dt>
            <dd>{createdAt}</dd>
            <dt>{t('users.labels.passkey-last-used')}</dt>
            <dd>{lastUsedAt}</dd>
          </dl>
        </Card>
      ))}
    </div>
  );
};
