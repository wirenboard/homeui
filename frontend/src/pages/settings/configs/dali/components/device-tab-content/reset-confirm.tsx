import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Confirm } from '@/components/confirm';
import { RadioGroup } from '@/components/radio';
import type { ResetConfirmProps, ResetMode } from './types';

export const ResetConfirm = ({
  isOpened,
  isLoading,
  isDirty,
  onConfirm,
  closeCallback,
}: ResetConfirmProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ResetMode>('settings');

  useEffect(() => {
    if (isOpened) setMode('settings');
  }, [isOpened]);

  return (
    <Confirm
      isOpened={isOpened}
      heading={t('dali.labels.reset-dialog-heading')}
      variant="danger"
      acceptLabel={t('dali.buttons.reset-confirm')}
      isLoading={isLoading}
      confirmCallback={() => onConfirm(mode)}
      closeCallback={closeCallback}
    >
      <RadioGroup
        name="dali-reset-mode"
        value={mode}
        onChange={(value) => setMode(value as ResetMode)}
        isDisabled={isLoading}
        options={[
          {
            id: 'dali-reset-settings',
            value: 'settings',
            label: t('dali.labels.reset-settings-option-title'),
            description: t('dali.labels.reset-settings-option-description'),
          },
          {
            id: 'dali-reset-full',
            value: 'full',
            label: t('dali.labels.reset-device-option-title'),
            description: t('dali.labels.reset-device-option-description'),
          },
        ]}
      />
      {isDirty && (
        <Alert variant="warn" size="small" className="dali-resetWarning">
          {t('dali.labels.reset-unsaved-warning')}
        </Alert>
      )}
    </Confirm>
  );
};
