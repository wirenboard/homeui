import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { OptionsField, StringField } from '@/components/form';
import { type CopyDeviceModalProps } from './types';
import './styles.css';

export const CopyDeviceModal = ({ isOpened, currentPort, portOptions = [], onCopy, onClose }: CopyDeviceModalProps) => {
  const { t } = useTranslation();
  const [port, setPort] = useState(portOptions.find((port) => port.value === currentPort.path)?.value);
  const [count, setCount] = useState(1);

  return (
    <Confirm
      isOpened={isOpened}
      heading={t('device-manager.labels.copy-device')}
      acceptLabel={t('device-manager.buttons.copy')}
      isDisabled={!count || count < 1}
      confirmCallback={() => onCopy({ port, count })}
      closeCallback={() => onClose()}
    >
      <div className="copyDeviceModal-container">
        <OptionsField
          title={t('device-manager.labels.port')}
          value={port}
          options={portOptions}
          isSearchable
          onChange={(value: string) => setPort(value)}
        />

        <StringField
          title={t('device-manager.labels.copy-count')}
          value={count}
          type="number"
          min={1}
          error={count < 1 && t('editors.errors.integer_min', { min: 1 })}
          required
          onChange={(val: number) => setCount(val)}
        />
      </div>
    </Confirm>
  );
};
