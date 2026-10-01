import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { toggles, type SmartDeviceCapability } from '@/stores/alice';
import { type CapabilitySubProps } from '../types';
import { getAvailableToggleInstances } from './helpers';

export const ToggleCapability = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();
  const instanceId = useId();

  const getToggleInstanceOptions = useCallback((
    currentCapability: SmartDeviceCapability,
    currentCapabilityIndex: number,
  ) => {
    const availableInstances = getAvailableToggleInstances(capabilities, currentCapabilityIndex);
    const currentlySelectedInstance = currentCapability.parameters?.instance;

    return toggles.map((toggleInstance) => {
      const isCurrentlySelected = currentlySelectedInstance === toggleInstance;
      const isAvailableForUse = availableInstances.includes(toggleInstance);

      return {
        label: toggleInstance,
        value: toggleInstance,
        isDisabled: !isCurrentlySelected && !isAvailableForUse,
      };
    });
  }, [capabilities]);

  return (
    <div className="aliceDeviceSkills-colspan2">
      <label className="aliceDeviceSkills-gridLabel" htmlFor={instanceId}>{t('alice.labels.mode')}</label>
      <Dropdown
        size="small"
        id={instanceId}
        value={capability.parameters?.instance}
        options={getToggleInstanceOptions(capability, index)}
        onChange={({ value: instance }: Option<string>) => {
          const val = capabilities.map((item, i) => i === index
            ? { ...item, parameters: { ...item.parameters, instance } }
            : item);
          onCapabilityChange(val);
        }}
      />
    </div>
  );
};
