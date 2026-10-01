import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import {
  Capability,
  countModifiedCapability,
  getCapabilityDefaults,
  isFieldModified,
  type SmartDeviceCapability,
} from '@/stores/alice';
import { OptionsDivider, OptionsItem, OptionsPopup, updateItem } from '../../options';
import { type CapabilitySubProps } from '../../types';

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

  // Modified flags drive the accent border on each row in the popup
  const isRetrievableModified = isFieldModified(capability.retrievable, defaults.retrievable);
  const isReportableModified = isFieldModified(capability.reportable, defaults.reportable);
  const isSplitModified = showSplit
    && isFieldModified(capability.parameters?.split, defaults.parameters.split);

  // Apply a partial change to this capability and notify the parent
  const applyChange = (changes: Partial<SmartDeviceCapability>) =>
    onCapabilityChange(updateItem(capabilities, index, changes));

  const handleRetrievableChange = (checked: boolean) => applyChange({ retrievable: checked });
  const handleReportableChange = (checked: boolean) => applyChange({ reportable: checked });
  const handleSplitChange = (checked: boolean) => {
    const newParameters = { ...capability.parameters, split: checked };
    applyChange({ parameters: newParameters });
  };

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
