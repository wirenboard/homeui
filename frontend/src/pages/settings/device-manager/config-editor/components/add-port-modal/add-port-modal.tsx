import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { OptionsField } from '@/components/form';
import { type AddPortModalProps } from './types';

export const AddPortModal = ({ isOpened, portOptions = [], onSave, onClose }: AddPortModalProps) => {
  const { t } = useTranslation();
  const [port, setPort] = useState(portOptions.at(0)?.value);

  return (
    <Confirm
      isOpened={isOpened}
      heading={t('device-manager.buttons.add-port')}
      acceptLabel={t('device-manager.buttons.add-port')}
      confirmCallback={() => onSave(port)}
      closeCallback={() => onClose()}
    >
      <OptionsField
        title=""
        value={port}
        options={portOptions}
        isSearchable
        onChange={(value: string) => setPort(value)}
      />
    </Confirm>
  );
};
