import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MoreIcon from '@/assets/icons/more.svg';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Popup } from '@/components/popup';
import { Property } from '@/stores/alice';
import { type PropertySubProps } from './types';

export const PropertyOptionsButton = ({
  property, index, properties, onPropertyChange,
}: PropertySubProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Event checkbox is locked off: events may span multiple MQTT topics and
  // there is no local state cache, so the last known state cannot be returned
  // Client treats retrievable=true on events as false with a warning
  // (see wb-mqtt-alice device_registry._collect_properties)
  // Unlock once local state storage is implemented
  const eventLocked = property.type === Property.Event;
  const retrievable = eventLocked ? false : (property.retrievable ?? true);

  const handleRetrievableChange = (checked: boolean) => {
    const updated = properties.map((item, i) => (
      i === index ? { ...item, retrievable: checked } : item
    ));
    onPropertyChange(updated);
  };

  const content = (
    <div className="aliceDeviceSkills-optionsContent">
      <Checkbox
        checked={retrievable}
        title={t('alice.labels.retrievable')}
        ariaLabel={t('alice.labels.retrievable')}
        isDisabled={eventLocked}
        onChange={handleRetrievableChange}
      />
      {!eventLocked && (
        <div className="aliceDeviceSkills-optionsHint">
          {t('alice.labels.retrievable-hint')}
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
        icon={<MoreIcon />}
        variant="secondary"
        isOutlined
        title={t('alice.labels.property-options')}
        aria-label={t('alice.labels.property-options')}
      />
    </Popup>
  );
};
