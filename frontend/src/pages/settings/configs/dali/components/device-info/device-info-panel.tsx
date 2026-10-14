import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { LAPTOP_MAX_WIDTH } from '@/common/breakpoints';
import { ZoomableImage } from '@/components/zoomable-image';
import type { DeviceInfoPanelProps } from './types';
import './styles.css';

export const DeviceInfoPanel = ({ description }: DeviceInfoPanelProps) => {
  const { t } = useTranslation();
  const isStacked = useMediaQuery({ maxWidth: LAPTOP_MAX_WIDTH });
  const imageKey = description.gtin || description.oem_gtin;
  const typeNames = (description.types ?? [])
    .map((type) => t(`dali.device-types.${type}`, { defaultValue: `DT${type}` }));
  const names = [description.brand_name, description.product_name].filter(Boolean);
  const fields = [
    // Without a name above, the types move into the fields, wide enough to stay on one line:
    // one type fits two columns, several get the whole row.
    ...(names.length ? [] : [{
      label: t('dali.labels.info-types'),
      value: typeNames.join(', '),
      className: typeNames.length > 1 ? 'daliDeviceInfo-fieldFull' : 'daliDeviceInfo-fieldWide',
    }]),
    { label: t('dali.labels.info-gtin'), value: description.gtin },
    { label: t('dali.labels.info-identification-number'), value: description.identification_number },
    { label: t('dali.labels.info-firmware'), value: description.firmware_version },
    { label: t('dali.labels.info-hardware'), value: description.hardware_version },
    { label: t('dali.labels.info-oem-gtin'), value: description.oem_gtin },
    { label: t('dali.labels.info-oem-identification-number'), value: description.oem_identification_number },
  ].filter(({ value }) => value !== undefined && value !== null && value !== '');

  if (!names.length && !fields.length && !imageKey) {
    return null;
  }

  return (
    <div className={classNames('daliDeviceInfo', { 'daliDeviceInfo-stacked': isStacked })}>
      <div className="daliDeviceInfo-body">
        {imageKey && (
          <ZoomableImage
            key={imageKey}
            className="daliDeviceInfo-picture"
            src={`/dali-images/${imageKey}.webp`}
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
