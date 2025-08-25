import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { ConfirmationProps } from './types';
import './styles.css';

export const Confirm = ({
  className,
  acceptLabel,
  heading,
  headerActions,
  children,
  confirmCallback,
  closeCallback,
  variant = 'default',
  isOpened = false,
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
      withPadding={false}
      showCloseButton={false}
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
        {!!children && <div className="dialog-content">{children}</div>}
        <div className="dialog-actions">
          <Button
            type="button"
            className="dialog-action"
            label={t('modal.labels.cancel')}
            variant="secondary"
            onClick={closeCallback}
          />
          <Button
            type="submit"
            disabled={isDisabled}
            className="dialog-action"
            label={acceptLabel || t('modal.labels.yes')}
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={confirmCallback}
          />
        </div>
      </form>
    </Dialog>
  );
};
