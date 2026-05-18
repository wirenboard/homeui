import { useTranslation } from 'react-i18next';
import { ButtonLink } from '@/components/button';
import { Card } from '@/components/card';
import './styles.css';

export const Backup = ({ className }) => {
  const { t } = useTranslation();

  return (
    <Card heading={t('system.backup.title')} variant="secondary" className={className}>
      <ul>
        <li>{t('system.backup.rootfs_warning1')}</li>
        <li>{t('system.backup.rootfs_warning2')}</li>
        <li>{t('system.backup.rootfs_warning3')}</li>
      </ul>

      <div className="backup-actions">
        <ButtonLink
          label={t('system.backup.download_rootfs_button')}
          href="fwupdate/download/rootfs"
          download
        />

        <ButtonLink
          label={t('system.backup.download_configs_button')}
          href="fwupdate/download/configs"
          download
        />

        <ButtonLink
          label={t('system.backup.download_everything_button')}
          href="fwupdate/download/everything"
          download
        />
      </div>
    </Card>
  );
};
