import classNames from 'classnames';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/dialog';
import { getDevicePictureUrl } from '@/stores/dali/device-store';
import { getDeviceInfoFields, getDeviceNames, getDeviceTypeNames } from './device-info-fields';
import type { DeviceInfoDialogProps, PicturePlacement } from './types';
import './styles.css';

export const DeviceInfoDialog = ({ description, isOpened, onClose }: DeviceInfoDialogProps) => {
  const { t } = useTranslation();
  const [placement, setPlacement] = useState<PicturePlacement>(null);
  const [isPictureFailed, setIsPictureFailed] = useState(false);
  const pictureUrl = getDevicePictureUrl(description);
  const names = getDeviceNames(description);
  const typeNames = getDeviceTypeNames(description, t);
  const fields = getDeviceInfoFields(description, t);

  return (
    <Dialog
      className={classNames('daliDeviceInfoDialog', placement && `daliDeviceInfoDialog-${placement}`)}
      isOpened={isOpened}
      heading={names.length ? names.join(' ') : t('dali.labels.info-device')}
      width={1500}
      onClose={onClose}
    >
      <div className="daliDeviceInfoDialog-body">
        {pictureUrl && !isPictureFailed && (
          <div className={classNames('daliDeviceInfoDialog-picture', { 'daliDeviceInfoDialog-loading': !placement })}>
            <img
              src={pictureUrl}
              alt={names.join(' ')}
              onLoad={({ currentTarget: img }) => setPlacement(img.naturalWidth < img.naturalHeight ? 'left' : 'top')}
              onError={() => setIsPictureFailed(true)}
            />
          </div>
        )}
        <div className="daliDeviceInfoDialog-text">
          {!!typeNames.length && <p className="daliDeviceInfoDialog-types">{typeNames.join(', ')}</p>}
          {!!fields.length && (
            <dl className="daliDeviceInfo-fields">
              {fields.map(({ label, value, className }) => (
                <div key={label} className={className}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </Dialog>
  );
};
