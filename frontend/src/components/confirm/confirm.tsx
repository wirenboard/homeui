import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Dialog } from '@/components/dialog';
import { ConfirmationProps } from './types';
import './styles.css';

export const Confirm = ({
  heading, children, confirmCallback, closeCallback, variant = 'default', isOpened = false,
}: PropsWithChildren<ConfirmationProps>) => {
  const { t } = useTranslation();

  return (
    <Dialog isOpened={isOpened} heading={heading} onClose={closeCallback}>
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
    </Dialog>
  );
};
