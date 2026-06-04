import { useTranslation } from 'react-i18next';
import { Card } from '@/components/card';
import './styles.css';

export const Backup = ({ className }) => {
  const { t } = useTranslation();

  return (
    <Card heading={t('system.backup.title')} variant="secondary" className={className}>
      <ul className="backup-list">
        <li>{t('system.backup.rootfs_warning1')}</li>
        <li>{t('system.backup.rootfs_warning2')}</li>
        <li>{t('system.backup.rootfs_warning3')}</li>
      </ul>

      <div className="backup-actions">
        <a
          href="fwupdate/download/rootfs"
          className="button button-m button-primary"
          download
        >
          {t('system.backup.download_rootfs_button')}
        </a>

        <a
          href="fwupdate/download/configs"
          className="button button-m button-primary"
          download
        >
          {t('system.backup.download_configs_button')}
        </a>

        <a
          href="fwupdate/download/everything"
          className="button button-m button-primary"
          download
        >
          {t('system.backup.download_everything_button')}
        </a>
      </div>
    </Card>
  );
};
