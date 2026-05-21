import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { Capability, toggles, type SmartDeviceCapability } from '@/stores/alice';

export const getAvailableToggleInstances = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number,
): string[] => {
  const usedInstances = capabilities
    .filter((cap, index) =>
      cap.type === Capability.Toggle &&
      index !== excludeIndex &&
      cap.parameters?.instance,
    )
    .map((cap) => cap.parameters.instance);

  return toggles.filter(
    (toggleInstance) => !usedInstances.includes(toggleInstance),
  );
};

interface ToggleCapabilityProps {
  capability: SmartDeviceCapability;
  index: number;
  capabilities: SmartDeviceCapability[];
  onCapabilityChange: (capabilities: SmartDeviceCapability[]) => void;
}

export const ToggleCapability = ({
  capability, index, capabilities, onCapabilityChange,
}: ToggleCapabilityProps) => {
  const { t } = useTranslation();

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
      <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mode')}</div>
      <Dropdown
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
