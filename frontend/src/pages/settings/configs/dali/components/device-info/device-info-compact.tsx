import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoIconButton } from '@/components/info-icon-button';
import { getDevicePictureUrl } from '@/stores/dali/device-store';
import { DeviceInfoDialog } from './device-info-dialog';
import { getDeviceInfoFields, getDeviceNames, getShortDeviceTypes } from './device-info-fields';
import type { DeviceInfoCompactProps } from './types';
import './styles.css';

export const DeviceInfoCompact = ({ description }: DeviceInfoCompactProps) => {
  const { t } = useTranslation();
  const [isDialogOpened, setIsDialogOpened] = useState(false);
  const names = getDeviceNames(description).join(' ');
  const types = getShortDeviceTypes(description);

  return (
    <div className="daliDeviceInfo daliDeviceInfo-compact">
      {!!names && <span className="daliDeviceInfo-compactName" title={names}>{names}</span>}
      {!!types && <span className="daliDeviceInfo-compactTypes" title={types}>{types}</span>}
      {(!!types || !!getDeviceInfoFields(description, t).length) && (
        <>
          <InfoIconButton
            className="daliDeviceInfo-infoButton"
            aria-label={t('dali.labels.info-device')}
            tooltip={t('dali.labels.info-device')}
            onClick={() => setIsDialogOpened(true)}
          />
          <DeviceInfoDialog
            key={getDevicePictureUrl(description)}
            description={description}
            isOpened={isDialogOpened}
            onClose={() => setIsDialogOpened(false)}
          />
        </>
      )}
    </div>
  );
};
