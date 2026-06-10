import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import {
  Capability,
  countModifiedCapability,
  getCapabilityDefaults,
  type SmartDeviceCapability,
} from '@/stores/alice';
import { OptionsDivider, OptionsItem, OptionsPopup } from '../options-popup';
import { type CapabilitySubProps } from '../types';

// Return a new array with the item at `index` merged with `changes`
// Used to update a single capability immutably
const updateCapability = (
  capabilities: SmartDeviceCapability[],
  index: number,
  changes: Partial<SmartDeviceCapability>,
): SmartDeviceCapability[] =>
  capabilities.map((item, i) => (i === index ? { ...item, ...changes } : item));

export const CapabilityOptionsButton = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();

  // Read current values from config; fall back to defaults if a field is missing
  const defaults = getCapabilityDefaults(capability.type);
  const retrievable = capability.retrievable ?? defaults.retrievable;
  const reportable = capability.reportable ?? defaults.reportable;
  const split = capability.parameters?.split ?? false;

  const showSplit = capability.type === Capability['On/Off'];

  // A field is "modified" when it is present in config AND differs from the default
  // Used to highlight the row with an accent border in the popup
  const isRetrievableModified = capability.retrievable !== undefined && retrievable !== defaults.retrievable;
  const isReportableModified = capability.reportable !== undefined && reportable !== defaults.reportable;
  const isSplitModified = showSplit
    && capability.parameters?.split !== undefined
    && split !== defaults.parameters.split;

  // Apply a partial change to this capability and notify the parent
  const applyChange = (changes: Partial<SmartDeviceCapability>) =>
    onCapabilityChange(updateCapability(capabilities, index, changes));

  const handleRetrievableChange = (checked: boolean) => applyChange({ retrievable: checked });
  const handleReportableChange = (checked: boolean) => applyChange({ reportable: checked });
  const handleSplitChange = (checked: boolean) =>
    applyChange({ parameters: { ...capability.parameters, split: checked } });

  return (
    <OptionsPopup
      ariaLabel={t('alice.labels.capability-options')}
      modifiedCount={countModifiedCapability(capability)}
    >
      <OptionsItem isModified={isRetrievableModified}>
        <Checkbox
          checked={retrievable}
          title={t('alice.labels.retrievable')}
          ariaLabel={t('alice.labels.retrievable')}
          onChange={handleRetrievableChange}
        />
        <div className="aliceDeviceSkills-optionsHint">
          {t('alice.labels.retrievable-hint')}
        </div>
      </OptionsItem>

      <OptionsDivider />
      <OptionsItem isModified={isReportableModified}>
        <Checkbox
          checked={reportable}
          title={t('alice.labels.reportable')}
          ariaLabel={t('alice.labels.reportable')}
          onChange={handleReportableChange}
        />
        <div className="aliceDeviceSkills-optionsHint">
          {t('alice.labels.reportable-hint')}
        </div>
      </OptionsItem>

      {showSplit && (
        <>
          <OptionsDivider />
          <OptionsItem isModified={isSplitModified}>
            <Checkbox
              checked={split}
              title={t('alice.labels.split')}
              ariaLabel={t('alice.labels.split')}
              onChange={handleSplitChange}
            />
            <div className="aliceDeviceSkills-optionsHint">
              {t('alice.labels.split-hint')}
            </div>
          </OptionsItem>
        </>
      )}
    </OptionsPopup>
  );
};
