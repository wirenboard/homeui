import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { OptionsField } from '@/components/form';
import { type SingleDeviceMoveProps } from './types';

export const SingleDeviceMove = ({ isOpened, device, targetPortOptions, onMove, onClose }: SingleDeviceMoveProps) => {
  const { t } = useTranslation();
  const [port, setPort] = useState(targetPortOptions[0]?.value);

  return (
    <Confirm
      isOpened={isOpened}
      heading={t('device-manager.labels.move-device')}
      acceptLabel={t('device-manager.buttons.move')}
      isDisabled={!port}
      confirmCallback={() => onMove(new Map([[device, port]]))}
      closeCallback={() => onClose()}
    >
      <div className="moveDeviceModal-container">
        <OptionsField
          title={t('device-manager.labels.port')}
          value={port}
          options={targetPortOptions}
          isSearchable
          onChange={(value: string) => setPort(value)}
        />
      </div>
    </Confirm>
  );
};
