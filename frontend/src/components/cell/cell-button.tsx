import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { CellHistory } from './cell-history';
import { type CellButtonProps } from './types';
import './styles.css';

const needsRebootConfirm = (deviceId: string, controlId: string) =>
  deviceId === 'system' && controlId === 'Reboot';

export const CellButton = observer(({ cell, name, isReadOnly, hideHistory }: CellButtonProps) => {
  const { t } = useTranslation();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const requiresConfirm = needsRebootConfirm(cell.deviceId, cell.controlId);

  const handleClick = () => {
    if (requiresConfirm) {
      setIsConfirmOpen(true);
    } else {
      cell.value = true;
    }
  };

  return (
    <>
      <Button
        label={name || cell.name}
        size="small"
        variant={cell.error ? 'danger' : 'primary'}
        disabled={cell.readOnly || isReadOnly}
        onClick={handleClick}
      />

      {!hideHistory && <CellHistory cell={cell} />}

      {requiresConfirm && (
        <Confirm
          isOpened={isConfirmOpen}
          heading={t('system.reboot_confirm.title')}
          variant="danger"
          acceptLabel={t('system.reboot_confirm.accept')}
          confirmCallback={() => {
            cell.value = true;
            setIsConfirmOpen(false);
          }}
          closeCallback={() => setIsConfirmOpen(false)}
        >
          {t('system.reboot_confirm.description')}
        </Confirm>
      )}
    </>
  );
});
