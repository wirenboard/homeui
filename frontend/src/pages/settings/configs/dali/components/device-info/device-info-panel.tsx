import { useTranslation } from 'react-i18next';
import { ZoomableImage } from '@/components/zoomable-image';
import { getDevicePictureUrl } from '@/stores/dali/device-store';
import { getDeviceInfoFields, getDeviceNames, getDeviceTypeNames } from './device-info-fields';
import type { DeviceInfoField, DeviceInfoPanelProps } from './types';
import './styles.css';

export const DeviceInfoPanel = ({ description }: DeviceInfoPanelProps) => {
  const { t } = useTranslation();
  const pictureUrl = getDevicePictureUrl(description);
  const typeNames = getDeviceTypeNames(description, t);
  const names = getDeviceNames(description);
  const fields: DeviceInfoField[] = [
    // Without a name above, the types move into the fields, wide enough to stay on one line:
    // one type fits two columns, several get the whole row.
    ...(names.length || !typeNames.length ? [] : [{
      label: t('dali.labels.info-types'),
      value: typeNames.join(', '),
      className: typeNames.length > 1 ? 'daliDeviceInfo-fieldFull' : 'daliDeviceInfo-fieldWide',
    }]),
    ...getDeviceInfoFields(description, t),
  ];

  if (!names.length && !fields.length && !pictureUrl) {
    return null;
  }

  return (
    <div className="daliDeviceInfo">
      <div className="daliDeviceInfo-body">
        {pictureUrl && (
          <ZoomableImage
            key={pictureUrl}
            className="daliDeviceInfo-picture"
            src={pictureUrl}
            alt={names.join(' ')}
          />
        )}
        <div className="daliDeviceInfo-text">
          {!!names.length && (
            <div>
              <p className="daliDeviceInfo-name">
                {names.map((name) => <span key={name}>{name}</span>)}
              </p>
              {!!typeNames.length && <p className="daliDeviceInfo-types">{typeNames.join(', ')}</p>}
            </div>
          )}
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
    </div>
  );
};
