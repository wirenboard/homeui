import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import {
  Capability,
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

export const getAvailableColorModels = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number,
): Color[] => {
  // Collect already used Color models among color-setting capabilities
  const usedColorModels = capabilities
    .filter((cap, index) => cap.type === Capability['Color setting'] && index !== excludeIndex)
    .map((cap) => {
      if (cap.parameters?.color_model) return Color.ColorModel;
      if (cap.parameters?.temperature_k) return Color.TemperatureK;
      if (cap.parameters?.color_scene) return Color.ColorScene;
      return null;
    })
    .filter(Boolean);

  return Object.values(Color)
    .filter((m) => m !== Color.ColorScene) // TODO: <DISABLED_COLOR> Its disable Color scene, need remove for enable
    .filter((colorModel) => !usedColorModels.includes(colorModel));
};

const getCurrentColorModel = (capability: SmartDeviceCapability) => {
  if (capability.parameters?.color_model) return Color.ColorModel;
  if (capability.parameters?.temperature_k) return Color.TemperatureK;
  if (capability.parameters?.color_scene) return Color.ColorScene;
  return Color.ColorModel; // Default value
};

const getColorModelLabel = (colorKey: string, t: (k: string) => string) => {
  switch (colorKey) {
    case 'ColorModel': return t('alice.labels.color-model');
    case 'TemperatureK': return t('alice.labels.color-temperature');
    case 'ColorScene': return t('alice.labels.color-scenes');
    default: return colorKey;
  }
};

export const ColorSettingCapability = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();

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
        <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.type')}</div>
        <Dropdown
          value={getCurrentColorModel(capability)}
          options={getColorModelOptions(capability, index)}
          onChange={({ value }: Option<Color>) => {
            handleColorSettingTypeChange(value, index);
          }}
        />
      </div>

      {getCurrentColorModel(capability) === Color.ColorModel && (
        <div>
          <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.color-model')}</div>
          <Dropdown
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
            <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.min')}</div>
            <Input
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
            <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.max')}</div>
            <Input
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
          <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.scenes-input')}</div>
          <Input
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
