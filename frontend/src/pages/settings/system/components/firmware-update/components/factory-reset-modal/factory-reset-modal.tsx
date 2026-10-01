import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { Input } from '@/components/input';
import { request } from '@/utils/request';
import { ModalMode } from '../../types';
import { UploadButton } from '../upload-button';
import type { FactoryResetModalProps } from './types';
import './styles.css';

export const FactoryResetModal = observer(({ isOpened, onCancel, mode, store }: FactoryResetModalProps) => {
  const { t } = useTranslation();
  const [confirmationText, setConfirmationText] = useState('');

  const submitRequest = async () => {
    store.activeMode = 'reset';
    store.onUploadStart();
    onCancel();

    try {
      await request.post(
        '/fwupdate/factoryreset',
        { factory_reset: true },
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      store.onUploadFinish();
    } catch (err) {
      store.onUploadError({ uploadResponse: { data: err?.message || 'Unknown error' } });
    }
  };

  return (
    <Dialog
      heading={t('system.factory_reset.modal_title')}
      width={650}
      isOpened={isOpened}
      onClose={onCancel}
    >
      <form method="dialog">
        <div>
          <Trans i18nKey="system.factory_reset.modal_page" />
          <div className="factoryResetModal-inputWrapper">
            <Trans i18nKey="system.factory_reset.confirm_prompt" />

            <Input
              type="text"
              value={confirmationText}
              onChange={(value: string) => setConfirmationText(value)}
            />
          </div>
        </div>

        <div className="factoryResetModal-footer">
          {mode === ModalMode.UpdateReset ? (
            <UploadButton
              variant="danger"
              label={t('system.buttons.select_and_reset')}
              disabled={confirmationText !== 'factoryreset'}
              onClick={onCancel}
            />
          ) : mode === ModalMode.FactoryReset ? (
            <Button
              type="submit"
              variant="danger"
              aria-haspopup="dialog"
              label={t('system.buttons.reset')}
              disabled={confirmationText !== 'factoryreset'}
              onClick={submitRequest}
            />
          ) : null}
        </div>
      </form>
    </Dialog>
  );
});
