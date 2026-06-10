import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MoreIcon from '@/assets/icons/more.svg';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Popup } from '@/components/popup';
import { Capability, type SmartDeviceCapability } from '@/stores/alice';
import { type CapabilitySubProps } from '../types';

// True if the given capability has any settings to show in the popup.
// Retrievable applies to every capability, so the kebab is shown for all types.
export const hasCapabilityOptions = (_type: Capability) => true;

const updateCapability = (
  capabilities: SmartDeviceCapability[],
  index: number,
  patch: Partial<SmartDeviceCapability>,
): SmartDeviceCapability[] =>
  capabilities.map((item, i) => (i === index ? { ...item, ...patch } : item));

export const CapabilityOptionsButton = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const retrievable = capability.retrievable ?? true;
  const split = capability.parameters?.split ?? false;

  const handleRetrievableChange = (checked: boolean) => {
    onCapabilityChange(updateCapability(capabilities, index, { retrievable: checked }));
  };

  const handleSplitChange = (checked: boolean) => {
    onCapabilityChange(updateCapability(capabilities, index, {
      parameters: { ...capability.parameters, split: checked },
    }));
  };

  const showSplit = capability.type === Capability['On/Off'];

  const content = (
    <div className="aliceDeviceSkills-optionsContent">
      <Checkbox
        checked={retrievable}
        title={t('alice.labels.retrievable')}
        ariaLabel={t('alice.labels.retrievable')}
        onChange={handleRetrievableChange}
      />
      <div className="aliceDeviceSkills-optionsHint">
        {t('alice.labels.retrievable-hint')}
      </div>

      {showSplit && (
        <>
          <div className="aliceDeviceSkills-optionsDivider" />
          <Checkbox
            checked={split}
            title={t('alice.labels.split')}
            ariaLabel={t('alice.labels.split')}
            onChange={handleSplitChange}
          />
          <div className="aliceDeviceSkills-optionsHint">
            {t('alice.labels.split-hint')}
          </div>
        </>
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
        title={t('alice.labels.capability-options')}
        aria-label={t('alice.labels.capability-options')}
      />
    </Popup>
  );
};
