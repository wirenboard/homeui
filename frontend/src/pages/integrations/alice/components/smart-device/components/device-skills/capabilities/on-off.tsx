import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import { type CapabilitySubProps } from '../types';

export const OnOffCapability = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();

  const split = capability.parameters?.split ?? false;

  const handleSplitChange = (checked: boolean) => {
    const updated = capabilities.map((item, i) => (i === index
      ? { ...item, parameters: { ...item.parameters, split: checked } }
      : item));
    onCapabilityChange(updated);
  };

  return (
    <div className="aliceDeviceSkills-colspan2">
      <Checkbox
        checked={split}
        title={t('alice.labels.split')}
        ariaLabel={t('alice.labels.split')}
        onChange={handleSplitChange}
      />
    </div>
  );
};
