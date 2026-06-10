import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import {
  countModifiedProperty,
  getPropertyDefaults,
  Property,
  type SmartDeviceProperty,
} from '@/stores/alice';
import { OptionsDivider, OptionsItem, OptionsPopup } from './options-popup';
import { type PropertySubProps } from './types';

// Return a new array with the item at `index` merged with `changes`
// Used to update a single property immutably
const updateProperty = (
  properties: SmartDeviceProperty[],
  index: number,
  changes: Partial<SmartDeviceProperty>,
): SmartDeviceProperty[] =>
  properties.map((item, i) => (i === index ? { ...item, ...changes } : item));

export const PropertyOptionsButton = ({
  property, index, properties, onPropertyChange,
}: PropertySubProps) => {
  const { t } = useTranslation();

  // Event properties have both options locked: retrievable forced to false and
  // reportable forced to true. Events may span multiple MQTT topics and we keep
  // no local state cache, so the last known state cannot be returned to Alice —
  // and disabling reporting would make the property useless (an event only
  // exists as a push update). See wb-mqtt-alice device_registry._collect_properties
  // TODO: unlock retrievable once a local state store is implemented
  const isEvent = property.type === Property.Event;
  const defaults = getPropertyDefaults(property.type);
  const retrievable = isEvent ? defaults.retrievable : (property.retrievable ?? defaults.retrievable);
  const reportable = isEvent ? defaults.reportable : (property.reportable ?? defaults.reportable);

  // A field is "modified" when it is present in config AND differs from the default
  // Event options are locked to defaults and never count as modified
  const isRetrievableModified = !isEvent && property.retrievable !== undefined && retrievable !== defaults.retrievable;
  const isReportableModified = !isEvent && property.reportable !== undefined && reportable !== defaults.reportable;

  // Apply a partial change to this property and notify the parent
  const applyChange = (changes: Partial<SmartDeviceProperty>) =>
    onPropertyChange(updateProperty(properties, index, changes));

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
