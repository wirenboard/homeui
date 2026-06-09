import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import { ranges, rangeUnitByInstance, type SmartDeviceCapability } from '@/stores/alice';
import { type CapabilitySubProps } from '../types';
import { getAvailableRangeInstances, RANGE_LIMITS_DEFAULT, RANGE_LIMITS_LOCKED } from './helpers';

export const RangeCapability = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();
  const modeId = `${idPrefix}-mode`;
  const minId = `${idPrefix}-min`;
  const maxId = `${idPrefix}-max`;
  const precisionId = `${idPrefix}-precision`;

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
        <label className="aliceDeviceSkills-gridLabel" htmlFor={modeId}>{t('alice.labels.mode')}</label>
        <Dropdown
          id={modeId}
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
                <label className="aliceDeviceSkills-gridLabel" htmlFor={minId}>{t('alice.labels.min')}</label>
                <Input
                  id={minId}
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
                <label className="aliceDeviceSkills-gridLabel" htmlFor={maxId}>{t('alice.labels.max')}</label>
                <Input
                  id={maxId}
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
                <label className="aliceDeviceSkills-gridLabel" htmlFor={precisionId}>
                  {t('alice.labels.precision')}
                </label>
                <Input
                  id={precisionId}
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
