import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { UploadButton } from '../upload-button';
import { type DownloadBackupModalProps } from './types';
import './styles.css';

export const DownloadBackupModal = ({ isOpened, onCancel }: DownloadBackupModalProps) => {
  const { t } = useTranslation();
  const [isFirstPage, setIsFirstPage] = useState(true);

  const download = () => {
    const link = document.createElement('a');

    link.setAttribute('href', '/fwupdate/download/rootfs');
    link.setAttribute('download', 'true');
    link.style.display = 'none';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  return (
    <Dialog isOpened={isOpened} heading={t('system.update.backup_modal_title')} onClose={onCancel}>
      {isFirstPage
        ? <Trans i18nKey="system.update.backup_first_page" />
        : <Trans i18nKey="system.update.backup_second_page" />
      }

      {isFirstPage ? (
        <div className="downloadBackupModal-footer">
          <Button
            type="button"
            label={t('system.buttons.download_backup')}
            onClick={() => {
              download();
              setIsFirstPage(false);
            }}
          />
          <UploadButton label={t('system.buttons.select_anyway')} variant="secondary" onClick={onCancel} />
        </div>
      ) : (
        <UploadButton label={t('system.buttons.select')} variant="secondary" onClick={onCancel} />
      )}
    </Dialog>
  );
};
