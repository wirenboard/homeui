import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Capability, ranges, rangeUnitByInstance, type SmartDeviceCapability } from '@/stores/alice';
import { type CapabilitySubProps } from '../types';

// Default range values for unlocked instances
export const RANGE_LIMITS_DEFAULT = { min: 0, max: 100, precision: 1 };

// Instances with fixed ranges that cannot be changed in UI
export const RANGE_LIMITS_LOCKED: Record<string, { min: number; max: number; precision?: number }> = {
  brightness: { min: 0, max: 100, precision: 1 },
  // channel: No lock applied
  humidity:   { min: 0, max: 100, precision: 1 },
  open:       { min: 0, max: 100, precision: 1 },
  // temperature: No lock applied
  // volume: No lock applied
};

export const getAvailableRangeInstances = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number,
): string[] => {
  const usedInstances = capabilities
    .filter((cap, index) =>
      cap.type === Capability.Range &&
      index !== excludeIndex &&
      cap.parameters?.instance,
    )
    .map((cap) => cap.parameters.instance);

  return ranges.filter(
    (rangeInstance) => !usedInstances.includes(rangeInstance),
  );
};

export const RangeCapability = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();

  const getRangeInstanceOptions = useCallback((
    currentCapability: SmartDeviceCapability,
    currentCapabilityIndex: number,
  ) => {
    const availableInstances = getAvailableRangeInstances(capabilities, currentCapabilityIndex);
    const currentlySelectedInstance = currentCapability.parameters?.instance;

    return ranges.map((rangeInstance) => {
      const isCurrentlySelected = currentlySelectedInstance === rangeInstance;
      const isAvailableForUse = availableInstances.includes(rangeInstance);

      return {
        label: rangeInstance,
        value: rangeInstance,
        isDisabled: !isCurrentlySelected && !isAvailableForUse,
      };
    });
  }, [capabilities]);

  return (
    <>
      <div>
        <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mode')}</div>
        <Dropdown
          value={capability.parameters?.instance}
          options={getRangeInstanceOptions(capability, index)}
          onChange={({ value: instance }: Option<string>) => {
            const unit = rangeUnitByInstance[instance];

            // If instance has a fixed range - apply it
            const rangeConfig = RANGE_LIMITS_LOCKED[instance] ?? RANGE_LIMITS_DEFAULT;
            const nextParams = {
              ...capability.parameters,
              instance,
              unit,
              range: {
                min: rangeConfig.min,
                max: rangeConfig.max,
                precision: rangeConfig.precision ?? capability.parameters?.range?.precision ?? 1,
              },
            };

            const val = capabilities.map((item, i) =>
              i === index ? { ...item, parameters: nextParams } : item,
            );
            onCapabilityChange(val);
          }}
        />
      </div>
      <div className="aliceDeviceSkills-gridRange">
        {(() => {
          const curInstance = capability.parameters?.instance as string;
          const fixedRange = RANGE_LIMITS_LOCKED[curInstance];
          const isRangeLocked = !!fixedRange;
          const lockedMin = fixedRange?.min ?? capability.parameters?.range?.min ?? 0;
          const lockedMax = fixedRange?.max ?? capability.parameters?.range?.max ?? 100;
          return (
            <>
              <div>
                <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.min')}</div>
                <Input
                  value={lockedMin}
                  type="number"
                  isDisabled={isRangeLocked}
                  isFullWidth
                  onChangeEvent={(event) => {
                    const min = event.currentTarget.valueAsNumber || 0;
                    const val = capabilities.map((item, i) => i === index
                      ? {
                        ...item,
                        parameters: { ...item.parameters, range: { ...item.parameters.range, min } },
                      }
                      : item);
                    onCapabilityChange(val);
                  }}
                />
              </div>
              <div>
                <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.max')}</div>
                <Input
                  value={lockedMax}
                  type="number"
                  isDisabled={isRangeLocked}
                  isFullWidth
                  onChangeEvent={(event) => {
                    const max = event.currentTarget.valueAsNumber || 0;
                    const val = capabilities.map((item, i) => i === index
                      ? {
                        ...item,
                        parameters: { ...item.parameters, range: { ...item.parameters.range, max } },
                      }
                      : item);
                    onCapabilityChange(val);
                  }}
                />
              </div>
              <div>
                <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.precision')}</div>
                <Input
                  value={capability.parameters?.range.precision}
                  type="number"
                  isFullWidth
                  onChangeEvent={(event) => {
                    const precision = event.currentTarget.valueAsNumber || 0;
                    const val = capabilities.map((item, i) => i === index
                      ? {
                        ...item,
                        parameters: { ...item.parameters, range: { ...item.parameters.range, precision } },
                      }
                      : item);
                    onCapabilityChange(val);
                  }}
                />
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
};
