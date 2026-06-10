import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MoreIcon from '@/assets/icons/more.svg';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Popup } from '@/components/popup';
import {
  countModifiedProperty,
  getPropertyDefaults,
  Property,
} from '@/stores/alice';
import { type PropertySubProps } from './types';

export const PropertyOptionsButton = ({
  property, index, properties, onPropertyChange,
}: PropertySubProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Event property: retrievable locked off, reportable locked on
  // retrievable: events may span multiple MQTT topics and there is no local
  //   state cache, so the last known state cannot be returned; client treats
  //   retrievable=true on events as false with a warning
  //   (see wb-mqtt-alice device_registry._collect_properties)
  // reportable: an event only exists as a push update, so disabling reporting
  //   would make the property useless
  // Unlock retrievable once local state storage is implemented
  const isEvent = property.type === Property.Event;
  const defaults = getPropertyDefaults(property.type);
  // Event property values are locked to defaults; non-event reads config with fallback
  const retrievable = isEvent ? defaults.retrievable : (property.retrievable ?? defaults.retrievable);
  const reportable = isEvent ? defaults.reportable : (property.reportable ?? defaults.reportable);

  const modifiedCount = countModifiedProperty(property);

  const handleRetrievableChange = (checked: boolean) => {
    const updated = properties.map((item, i) => (
      i === index ? { ...item, retrievable: checked } : item
    ));
    onPropertyChange(updated);
  };

  const handleReportableChange = (checked: boolean) => {
    const updated = properties.map((item, i) => (
      i === index ? { ...item, reportable: checked } : item
    ));
    onPropertyChange(updated);
  };

  const content = (
    <div className="aliceDeviceSkills-optionsContent">
      <Checkbox
        checked={retrievable}
        title={t('alice.labels.retrievable')}
        ariaLabel={t('alice.labels.retrievable')}
        isDisabled={isEvent}
        onChange={handleRetrievableChange}
      />
      {!isEvent && (
        <div className="aliceDeviceSkills-optionsHint">
          {t('alice.labels.retrievable-hint')}
        </div>
      )}

      <div className="aliceDeviceSkills-optionsDivider" />
      <Checkbox
        checked={reportable}
        title={t('alice.labels.reportable')}
        ariaLabel={t('alice.labels.reportable')}
        isDisabled={isEvent}
        onChange={handleReportableChange}
      />
      {!isEvent && (
        <div className="aliceDeviceSkills-optionsHint">
          {t('alice.labels.reportable-hint')}
        </div>
      )}
    </div>
  );

  return (
    <Popup
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-end"
      content={content}
    >
      <Button
        size="small"
        type="button"
        icon={(
          <span className="aliceDeviceSkills-optionsIcon">
            <MoreIcon />
            {modifiedCount > 0 && (
              <span className="aliceDeviceSkills-optionsBadge">{modifiedCount}</span>
            )}
          </span>
        )}
        variant="secondary"
        isOutlined
        title={t('alice.labels.property-options')}
        aria-label={t('alice.labels.property-options')}
      />
    </Popup>
  );
};
