import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MoreIcon from '@/assets/icons/more.svg';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Popup } from '@/components/popup';
import { Capability } from '@/stores/alice';
import { type CapabilitySubProps } from '../types';

// Returns true if the given capability has any settings to show in the popup.
// Keeps the kebab button hidden for capabilities with no options yet.
export const hasCapabilityOptions = (type: Capability) =>
  type === Capability['On/Off'];

export const CapabilityOptionsButton = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const renderOptions = () => {
    if (capability.type === Capability['On/Off']) {
      const split = capability.parameters?.split ?? false;
      const handleSplitChange = (checked: boolean) => {
        const updated = capabilities.map((item, i) => (i === index
          ? { ...item, parameters: { ...item.parameters, split: checked } }
          : item));
        onCapabilityChange(updated);
      };
      return (
        <div className="aliceDeviceSkills-optionsContent">
          <Checkbox
            checked={split}
            title={t('alice.labels.split')}
            ariaLabel={t('alice.labels.split')}
            onChange={handleSplitChange}
          />
          <div className="aliceDeviceSkills-optionsHint">
            {t('alice.labels.split-hint')}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Popup
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-end"
      content={renderOptions()}
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
