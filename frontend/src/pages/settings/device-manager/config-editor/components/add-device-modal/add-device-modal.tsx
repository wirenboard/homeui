import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { OptionsField } from '@/components/form';
import { type AddDeviceModalProps } from './types';
import './styles.css';

export const AddDeviceModal = ({
  isOpened,
  currentPort,
  portOptions = [],
  deviceOptions = [],
  onSave,
  onClose,
}: AddDeviceModalProps) => {
  const { t } = useTranslation();
  const [port, setPort] = useState(portOptions.find((port) => port.value === currentPort.path)?.value);
  const initTypeValue = deviceOptions.at(0)?.options?.at(0)?.value ?? deviceOptions.at(0)?.value;
  const [deviceType, setDeviceType] = useState(initTypeValue);

  return (
    <Confirm
      isOpened={isOpened}
      heading={t('device-manager.labels.add-device')}
      acceptLabel={t('device-manager.buttons.add')}
      confirmCallback={() => onSave({ port, deviceType })}
      closeCallback={() => onClose()}
    >
      <div className="addDeviceModal-container">
        <OptionsField
          title={t('device-manager.labels.port')}
          value={port}
          options={portOptions}
          isSearchable
          onChange={(value: string) => setPort(value)}
        />
        <OptionsField
          title={t('device-manager.labels.device-type')}
          value={deviceType}
          options={deviceOptions}
          isSearchable
          onChange={(value: string) => setDeviceType(value)}
        />
      </div>
    </Confirm>
  );
};
