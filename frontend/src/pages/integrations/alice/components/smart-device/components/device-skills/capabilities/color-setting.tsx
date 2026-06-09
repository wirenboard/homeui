import { useCallback, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import {
  Color,
  ColorModel,
  type CapabilityParameters,
  type SmartDeviceCapability,
  // colorSceneOptions, // TODO: <DISABLED_COLOR> - need uncomment for Color Scenes activation in WEBUI
  defaultColorModelParameters,
  defaultTemperatureParameters,
  defaultColorSceneParameters,
} from '@/stores/alice';
import { type CapabilitySubProps } from '../types';
import { getAvailableColorModels, getColorModelLabel, getCurrentColorModel } from './helpers';

export const ColorSettingCapability = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();
  const typeId = `${idPrefix}-type`;
  const colorModelId = `${idPrefix}-color-model`;
  const minId = `${idPrefix}-min`;
  const maxId = `${idPrefix}-max`;
  const scenesId = `${idPrefix}-scenes`;

  const handleColorSettingTypeChange = useCallback((
    value: Color,
    key: number,
  ) => {
    let newParameters: CapabilityParameters = {};

    if (value === Color.ColorModel) {
      Object.assign(newParameters, defaultColorModelParameters[ColorModel.RGB]);
    } else if (value === Color.TemperatureK) {
      Object.assign(newParameters, defaultTemperatureParameters);
    } else if (value === Color.ColorScene) {
      Object.assign(newParameters, defaultColorSceneParameters);
    }

    const updatedCapabilities = capabilities.map((item, i) => i === key
      ? { ...item, parameters: newParameters }
      : item);
    onCapabilityChange(updatedCapabilities);
  }, [capabilities]);

  const handleColorModelInstanceChange = useCallback((
    value: ColorModel,
    key: number,
  ) => {
    const newParameters = defaultColorModelParameters[value];

    const updatedCapabilities = capabilities.map((item, i) => i === key
      ? { ...item, parameters: newParameters }
      : item);
    onCapabilityChange(updatedCapabilities);
  }, [capabilities]);

  const handleTemperatureParameterChange = useCallback((
    paramType: 'min' | 'max',
    value: number,
    key: number,
  ) => {
    const updatedCapabilities = capabilities.map((item, i) => i === key
      ? {
        ...item,
        parameters: {
          ...item.parameters,
          temperature_k: {
            ...item.parameters.temperature_k,
            [paramType]: value,
          },
        },
      }
      : item);
    onCapabilityChange(updatedCapabilities);
  }, [capabilities]);

  const handleColorScenesChange = useCallback((
    scenes: string,
    key: number,
  ) => {
    const sceneList = scenes.split(',').map((s) => s.trim()).filter(Boolean);
    const updatedCapabilities = capabilities.map((item, i) => i === key
      ? {
        ...item,
        parameters: {
          ...item.parameters,
          color_scene: {
            ...item.parameters.color_scene,
            scenes: sceneList,
          },
        },
      }
      : item);
    onCapabilityChange(updatedCapabilities);
  }, [capabilities]);

  const getColorModelOptions = useMemo(() => {
    return (currentCapability: SmartDeviceCapability, currentCapabilityIndex: number) => {
      const availableModels = getAvailableColorModels(capabilities, currentCapabilityIndex);
      const currentlySelectedModel = getCurrentColorModel(currentCapability);

      return Object.keys(Color)
        // TODO: <DISABLED_COLOR> This line disable Color scene, need remove for enable
        .filter((colorKey) => colorKey !== 'ColorScene')
        .map((colorKey) => {
          const modelValue = Color[colorKey];
          const isCurrentlySelected = currentlySelectedModel === modelValue;
          const isAvailableForUse = availableModels.includes(modelValue);

          return {
            label: getColorModelLabel(colorKey, t),
            value: modelValue,
            isDisabled: !isCurrentlySelected && !isAvailableForUse,
          };
        });
    };
  }, [capabilities]);

  return (
    <>
      <div>
        <label className="aliceDeviceSkills-gridLabel" htmlFor={typeId}>{t('alice.labels.type')}</label>
        <Dropdown
          id={typeId}
          value={getCurrentColorModel(capability)}
          options={getColorModelOptions(capability, index)}
          onChange={({ value }: Option<Color>) => {
            handleColorSettingTypeChange(value, index);
          }}
        />
      </div>

      {getCurrentColorModel(capability) === Color.ColorModel && (
        <div>
          <label className="aliceDeviceSkills-gridLabel" htmlFor={colorModelId}>{t('alice.labels.color-model')}</label>
          <Dropdown
            id={colorModelId}
            value={capability.parameters?.color_model ?? null}
            options={Object.keys(ColorModel)
              // TODO: <DISABLED_COLOR> This line disable Color HSV, need remove for enable
              .filter((m) => m !== 'HSV' || capability.parameters?.color_model === ColorModel.HSV)
              .map((model) => ({
                label: model,
                value: ColorModel[model as keyof typeof ColorModel],
              }))}
            onChange={({ value }: Option<ColorModel>) => {
              handleColorModelInstanceChange(value, index);
            }}
          />
        </div>
      )}

      {capability.parameters?.temperature_k && (
        <div className="aliceDeviceSkills-gridRange">
          <div>
            <label className="aliceDeviceSkills-gridLabel" htmlFor={minId}>{t('alice.labels.min')}</label>
            <Input
              id={minId}
              value={capability.parameters?.temperature_k?.min}
              type="number"
              isFullWidth
              onChangeEvent={(event) => {
                const min = event.currentTarget.valueAsNumber || 0;
                handleTemperatureParameterChange('min', min, index);
              }}
            />
          </div>
          <div>
            <label className="aliceDeviceSkills-gridLabel" htmlFor={maxId}>{t('alice.labels.max')}</label>
            <Input
              id={maxId}
              value={capability.parameters?.temperature_k?.max}
              type="number"
              isFullWidth
              onChangeEvent={(event) => {
                const max = event.currentTarget.valueAsNumber || 0;
                handleTemperatureParameterChange('max', max, index);
              }}
            />
          </div>
        </div>
      )}

      {getCurrentColorModel(capability) === Color.ColorScene && (
        <div>
          <label className="aliceDeviceSkills-gridLabel" htmlFor={scenesId}>{t('alice.labels.scenes-input')}</label>
          <Input
            id={scenesId}
            value={capability.parameters?.color_scene?.scenes?.join(', ') || ''}
            placeholder="ocean, sunset, party"
            isFullWidth
            onChange={(scenes: string) => {
              handleColorScenesChange(scenes, index);
            }}
          />
        </div>
      )}
    </>
  );
};
