import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { type ConfirmationProps } from './types';
import './styles.css';

export const Confirm = ({
  className,
  acceptLabel,
  cancelLabel,
  heading,
  headerActions,
  children,
  confirmCallback,
  closeCallback,
  width,
  variant = 'primary',
  isOpened = false,
  isOverlayCloseDisabled = false,
  isPreventSubmit = false,
  isDisabled = false,
}: PropsWithChildren<ConfirmationProps>) => {
  const { t } = useTranslation();

  return (
    <Dialog
      className={className}
      isOpened={isOpened}
      heading={heading}
      headerActions={headerActions}
      width={width}
      withPadding={false}
      showCloseButton={false}
      isOverlayCloseDisabled={isOverlayCloseDisabled}
      onClose={closeCallback}
    >
      <form
        method="dialog"
        onKeyDown={(ev) => {
          if (isPreventSubmit && ev.key === 'Enter') {
            ev.preventDefault();
          }
        }}
      >
        {!!children && <div className="confirm-content">{children}</div>}
        <div className="confirm-actions">
          <Button
            type="button"
            className="confirm-action"
            label={cancelLabel || t('modal.labels.cancel')}
            variant="secondary"
            onClick={closeCallback}
          />
          <Button
            type="submit"
            disabled={isDisabled}
            className="confirm-action"
            label={acceptLabel || t('modal.labels.yes')}
            variant={variant}
            onClick={confirmCallback}
          />
        </div>
      </form>
    </Dialog>
  );
};
