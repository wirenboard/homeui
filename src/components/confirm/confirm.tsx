import { PropsWithChildren, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { ConfirmationParams } from './types';
import './styles.css';

export const Confirm = ({
  heading, children, confirmCallback, closeCallback, variant = 'default', isOpened = false,
}: PropsWithChildren<ConfirmationParams>) => {
  const { t } = useTranslation();
  const confirm = useRef<HTMLDialogElement>();

  useEffect(() => {
    if (confirm.current) {
      if (isOpened) {
        confirm.current.showModal();
      } else {
        confirm.current.close();
      }
    }
  }, [confirm, isOpened]);

  return (
    <dialog className="dialog" ref={confirm} onClose={closeCallback}>
      {isOpened && (
        <>
          <h3 className="dialog-title">{heading}</h3>
          <form method="dialog">
            {!!children && <div className="dialog-description">{children}</div>}

            <div className="dialog-actions">
              <Button type="submit" className="dialog-action" label={t('modal.labels.cancel')} variant="secondary" />
              <Button
                type="submit"
                className="dialog-action"
                label={t('modal.labels.yes')}
                variant={variant === 'danger' ? 'danger' : 'primary'}
                onClick={confirmCallback}
              />
            </div>
          </form>
        </>
      )}
    </dialog>
  );
};
