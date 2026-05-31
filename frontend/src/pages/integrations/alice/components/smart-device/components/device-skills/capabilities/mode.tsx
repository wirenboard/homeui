import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactSortable } from 'react-sortablejs';
import MoveIcon from '@/assets/icons/move.svg';
import PlusIcon from '@/assets/icons/plus.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import {
  Capability,
  modeInstances,
  modes,
  recommendedModesByInstance,
  type CapabilityParameters,
  type ModeMapping,
  type SmartDeviceCapability,
} from '@/stores/alice';
import { type CapabilitySubProps } from '../types';

export const getAvailableModeInstances = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number,
): string[] => {
  const usedInstances = capabilities
    .filter((cap, index) =>
      cap.type === Capability.Mode &&
      index !== excludeIndex &&
      cap.parameters?.instance,
    )
    .map((cap) => cap.parameters.instance);

  return modeInstances.filter(
    (modeInstance) => !usedInstances.includes(modeInstance),
  );
};

export const ModeCapability = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();
  const instanceId = useId();

  const currentInstance = capability.parameters?.instance as string;
  const recommended = recommendedModesByInstance[currentInstance] ?? [];
  const recommendedSet = new Set(recommended);
  const others = modes.filter((m) => !recommendedSet.has(m));
  const modesList: ModeMapping[] = capability.parameters?.modes ?? [];

  const updateParameters = (nextParameters: CapabilityParameters) => {
    const updated = capabilities.map((item, i) => (i === index
      ? { ...item, parameters: nextParameters }
      : item));
    onCapabilityChange(updated);
  };

  const handleInstanceChange = (instance: string) => {
    updateParameters({ ...capability.parameters, instance });
  };

  const handleModeValueChange = (rowIdx: number, value: string) => {
    const newModes = modesList.map((m, i) => (i === rowIdx ? { ...m, value } : m));
    updateParameters({ ...capability.parameters, modes: newModes });
  };

  const handleMqttValueChange = (rowIdx: number, mqttValue: string) => {
    const newModes = modesList.map((m, i) => (i === rowIdx ? { ...m, mqtt_value: mqttValue } : m));
    updateParameters({ ...capability.parameters, modes: newModes });
  };

  // Returns an error message for the mqtt_value in the given row, or null if valid.
  // Allowed format: lowercase Latin letters, digits, or underscore.
  // Empty string is not considered invalid — user hasn't typed yet.
  // Duplicates of mqtt_value across rows are also flagged.
  const getMqttValueError = (value: string, rowIdx: number): string | null => {
    if (value.length === 0) return null;
    if (!/^[a-z0-9_]+$/.test(value)) return t('alice.labels.mqtt-value-hint');
    const otherValues = modesList.filter((_, i) => i !== rowIdx).map((m) => m.mqtt_value);
    if (otherValues.includes(value)) return t('alice.labels.mqtt-value-duplicate');
    return null;
  };

  const handleAddMode = () => {
    const usedValues = modesList.map((m) => m.value);
    // Pick first unused recommended mode; fall back to first unused from any mode.
    const nextValue = recommended.find((v) => !usedValues.includes(v))
      ?? modes.find((v) => !usedValues.includes(v))
      ?? '';
    // Default mqtt_value = max numeric + 1 to avoid collisions after deletions.
    // Custom string values are ignored when computing the next index.
    const numericMqttValues = modesList
      .map((m) => Number(m.mqtt_value))
      .filter((n) => !Number.isNaN(n));
    const nextMqttIdx = numericMqttValues.length > 0
      ? Math.max(...numericMqttValues) + 1
      : 0;
    const newModes: ModeMapping[] = [
      ...modesList,
      { value: nextValue, mqtt_value: String(nextMqttIdx) },
    ];
    updateParameters({ ...capability.parameters, modes: newModes });
  };

  const handleDeleteMode = (rowIdx: number) => {
    const newModes = modesList.filter((_, i) => i !== rowIdx);
    updateParameters({ ...capability.parameters, modes: newModes });
  };

  const getModeOptions = (currentValue: string, rowIdx: number) => {
    const usedValues = modesList.filter((_, i) => i !== rowIdx).map((m) => m.value);
    const toOption = (v: string) => ({
      label: v,
      value: v,
      isDisabled: usedValues.includes(v) && v !== currentValue,
    });
    const groups = [];
    if (recommended.length > 0) {
      groups.push({
        label: t('alice.labels.recommended-for', { instance: currentInstance }),
        options: recommended.map(toOption),
      });
    }
    if (others.length > 0) {
      groups.push({
        label: t('alice.labels.other-modes'),
        options: others.map(toOption),
      });
    }
    return groups;
  };

  const allValuesUsed = modesList.length >= modes.length;

  const availableInstances = getAvailableModeInstances(capabilities, index);
  const currentInstanceValue = capability.parameters?.instance;
  const instanceOptions = modeInstances.map((inst) => ({
    label: inst,
    value: inst,
    isDisabled: !availableInstances.includes(inst) && inst !== currentInstanceValue,
  }));

  const instanceField = (
    <div>
      <label className="aliceDeviceSkills-gridLabel" htmlFor={instanceId}>
        {t('alice.labels.function-type')}
      </label>
      <Dropdown
        id={instanceId}
        value={capability.parameters?.instance}
        options={instanceOptions}
        onChange={({ value }: Option<string>) => handleInstanceChange(value)}
      />
    </div>
  );

  const modesListField = (
    <div className="aliceDeviceSkills-modesList">
      <ReactSortable
        list={modesList.map((m, i) => ({ ...m, id: `${m.value}-${i}` }))}
        setList={(items) => {
          if (!items.length) return;
          // Strip helper fields added by react-sortablejs and our local id.
          const cleaned: ModeMapping[] = items.map(({ chosen, selected, id, ...rest }: any) => rest);
          // Avoid update if nothing actually changed (lib calls setList on every render).
          if (JSON.stringify(cleaned) !== JSON.stringify(modesList)) {
            updateParameters({ ...capability.parameters, modes: cleaned });
          }
        }}
        handle=".aliceDeviceSkills-modesDragHandle"
        animation={150}
      >
        {modesList.map((mode, rowIdx) => (
          <div key={rowIdx} className="aliceDeviceSkills-modesRow">
            <div className="aliceDeviceSkills-modesDragHandle">
              {modesList.length > 1 && <MoveIcon />}
            </div>
            <div>
              {rowIdx === 0 && (
                <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mode-value')}</div>
              )}
              <Dropdown
                value={mode.value}
                options={getModeOptions(mode.value, rowIdx) as any[]}
                isSearchable
                onChange={({ value }: Option<string>) => handleModeValueChange(rowIdx, value)}
              />
            </div>
            <div>
              {rowIdx === 0 && (
                <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mqtt-value')}</div>
              )}
              {(() => {
                const mqttError = getMqttValueError(mode.mqtt_value, rowIdx);
                return (
                  <Input
                    value={mode.mqtt_value}
                    isFullWidth
                    isInvalid={!!mqttError}
                    title={mqttError ?? undefined}
                    onChange={(v: string) => handleMqttValueChange(rowIdx, v)}
                  />
                );
              })()}
            </div>
            <div className="aliceDeviceSkills-modesRowDelete">
              <Button
                size="small"
                type="button"
                icon={<TrashIcon />}
                variant="secondary"
                isOutlined
                onClick={() => handleDeleteMode(rowIdx)}
              />
            </div>
          </div>
        ))}
      </ReactSortable>
      <Button
        className="aliceDeviceSkills-addModeButton"
        label={t('alice.buttons.add-mode')}
        icon={<PlusIcon />}
        variant="secondary"
        disabled={allValuesUsed}
        onClick={handleAddMode}
      />
    </div>
  );

  return (
    <div className="aliceDeviceSkills-colspan2">
      {instanceField}
      {modesListField}
    </div>
  );
};
