import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import {
  countModifiedProperty,
  getPropertyDefaults,
  isFieldModified,
  Property,
  type SmartDeviceProperty,
} from '@/stores/alice';
import { OptionsDivider } from './options-divider';
import { OptionsItem } from './options-item';
import { OptionsPopup } from './options-popup';
import { type PropertySubProps } from './types';
import { updateItem } from './update-item';

export const PropertyOptionsButton = ({
  property, index, properties, onPropertyChange,
}: PropertySubProps) => {
  const { t } = useTranslation();

  // Event properties have locked options (retrievable=false, reportable=true)
  // See wb-mqtt-alice device_registry._collect_properties for the rationale
  // TODO: unlock retrievable once a local state store is implemented
  const isEvent = property.type === Property.Event;
  const defaults = getPropertyDefaults(property.type);

  let retrievable: boolean;
  let reportable: boolean;
  if (isEvent) {
    retrievable = defaults.retrievable;
    reportable = defaults.reportable;
  } else {
    retrievable = property.retrievable ?? defaults.retrievable;
    reportable = property.reportable ?? defaults.reportable;
  }

  // Event options never count as modified — they are locked to defaults
  const isRetrievableModified = !isEvent
    && isFieldModified(property.retrievable, defaults.retrievable);
  const isReportableModified = !isEvent
    && isFieldModified(property.reportable, defaults.reportable);

  // Apply a partial change to this property and notify the parent
  const applyChange = (changes: Partial<SmartDeviceProperty>) =>
    onPropertyChange(updateItem(properties, index, changes));

  const handleRetrievableChange = (checked: boolean) => applyChange({ retrievable: checked });
  const handleReportableChange = (checked: boolean) => applyChange({ reportable: checked });

  return (
    <OptionsPopup
      ariaLabel={t('alice.labels.property-options')}
      modifiedCount={countModifiedProperty(property)}
    >
      <OptionsItem isModified={isRetrievableModified}>
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
      </OptionsItem>

      <OptionsDivider />
      <OptionsItem isModified={isReportableModified}>
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
      </OptionsItem>
    </OptionsPopup>
  );
};
