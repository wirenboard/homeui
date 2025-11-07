import { observer } from 'mobx-react-lite';
import { Fragment, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import {
  Capability,
  Color,
  ColorModel,
  // modes, // TODO: <DISABLED_MODE> - need uncomment for Mode activation in WEBUI
  ranges,
  // toggles, // TODO: <DISABLED_TOGGLE> - need uncomment for Toggle activation in WEBUI
  type CapabilityParameters,
  type SmartDeviceCapability,
  // colorSceneOptions, // TODO: <DISABLED_COLOR> - need uncomment for Color Scenes activation in WEBUI
  rangeUnitByInstance,
  defaultColorModelParameters,
  defaultTemperatureParameters,
  defaultColorSceneParameters
} from '@/stores/alice';

// Default range values for unlocked instances
const RANGE_LIMITS_DEFAULT = { min: 0, max: 100, precision: 1 };

// Instances with fixed ranges that cannot be changed in UI
const RANGE_LIMITS_LOCKED: Record<string, { min: number; max: number; precision?: number }> = {
  brightness: { min: 0, max: 100, precision: 1 },
  // channel: No lock applied
  humidity:   { min: 0, max: 100, precision: 1 },
  open:       { min: 0, max: 100, precision: 1 },
  // temperature: No lock applied
  // volume: No lock applied
};

interface DeviceCapabilitiesProps {
  capabilities: SmartDeviceCapability[];
  deviceStore: any;
  onCapabilityChange: (capabilities: SmartDeviceCapability[]) => void;
}

const getAvailableColorModels = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number
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
    // TODO: <DISABLED_COLOR> This line disable Color scene, need remove for enable
    .filter((m) => m !== Color.ColorScene)
    .filter((colorModel) => !usedColorModels.includes(colorModel));
};

const getCurrentColorModel = (capability: SmartDeviceCapability) => {
  if (capability.parameters?.color_model) return Color.ColorModel;
  if (capability.parameters?.temperature_k) return Color.TemperatureK;
  if (capability.parameters?.color_scene) return Color.ColorScene;
  return Color.ColorModel; // Default value
};

const getAvailableRangeInstances = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number
): string[] => {
  const usedInstances = capabilities
    .filter((cap, index) =>
      cap.type === Capability.Range &&
      index !== excludeIndex &&
      cap.parameters?.instance
    )
    .map((cap) => cap.parameters.instance);

  return ranges.filter(
    (rangeInstance) => !usedInstances.includes(rangeInstance)
  );
};

const getColorModelLabel = (colorKey: string, t: (k: string) => string) => {
  switch (colorKey) {
    case 'ColorModel': return t('alice.labels.color-model');
    case 'TemperatureK': return t('alice.labels.color-temperature');
    case 'ColorScene': return t('alice.labels.color-scenes');
    default: return colorKey;
  }
};

const isCapabilityDisabled = (
  capabilityType: Capability,
  capabilities: SmartDeviceCapability[]
) => {
  if (capabilityType === Capability['Color setting']) {
    // For color setting, disable only if all color models are used
    return !getAvailableColorModels(capabilities).length;
  }

  if (capabilityType === Capability.Range) {
    // For range, disable only if all range instances are used
    return !getAvailableRangeInstances(capabilities).length;
  }

  // For other capabilities, use existing logic
  return capabilities.find((item) => item.type === capabilityType);
};

export const DeviceCapabilities = observer(({
  capabilities, deviceStore, onCapabilityChange,
}: DeviceCapabilitiesProps) => {
  const { t } = useTranslation();

  const handleColorSettingTypeChange = useCallback((
    value: Color,
    key: number
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
    key: number
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
    key: number
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
    key: number
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

  const getRangeInstanceOptions = useCallback((
    currentCapability: SmartDeviceCapability,
    currentCapabilityIndex: number
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

  const getAvailableCapabilities = () => {
    const availableCapabilities = Object.values(Capability).filter((capType) => {
      return !isCapabilityDisabled(capType, capabilities);
    });
    return availableCapabilities;
  };

  const getCapabilityParameters = (type: Capability) => {
    const parameters: CapabilityParameters = {};
    switch (type) {
      case Capability['Color setting']: {
        // Choose the first available color model
        const availableColorModels = getAvailableColorModels(capabilities);
        const selectedModel = availableColorModels[0] || Color.ColorModel;

        // Generate correct structure for current model
        if (selectedModel === Color.ColorModel) {
          Object.assign(parameters, defaultColorModelParameters[ColorModel.RGB]);
        } else if (selectedModel === Color.TemperatureK) {
          Object.assign(parameters, defaultTemperatureParameters);
        } else if (selectedModel === Color.ColorScene) {
          Object.assign(parameters, defaultColorSceneParameters);
        }

        break;
      }
      // TODO: <DISABLED_MODE> - need uncomment for Mode activation in WEBUI
      // case Capability.Mode: {
      //   parameters.instance = 'wet_cleaning';
      //   parameters.modes = 'start=1, stop=0';
      //   break;
      // }
      case Capability.Range: {
        // Select first available instance
        const availableInstances = getAvailableRangeInstances(capabilities);
        const selectedInstance = availableInstances[0] || 'brightness'; // fallback to brightness
        const rangeConfig = RANGE_LIMITS_LOCKED[selectedInstance] ?? RANGE_LIMITS_DEFAULT;

        parameters.instance = selectedInstance;
        parameters.range = {
          min: rangeConfig.min,
          max: rangeConfig.max,
          precision: rangeConfig.precision ?? 1,
        };
        parameters.unit = rangeUnitByInstance[selectedInstance];
        break;
      }
      // <DISABLED_TOGGLE> - need uncomment for Toggle activation in WEBUI
      // case Capability.Toggle: {
      //   parameters.instance = 'backlight';
      //   break;
      // }
      case Capability['On/Off']: {
        parameters.instance = 'on';
        break;
      }
    }
    return parameters;
  };

  const onCapabilityTypeChange = (type: Capability, key: number) => {
    const parameters = getCapabilityParameters(type);
    onCapabilityChange(capabilities.map((item, i) => (
      i === key ? { ...item, type, parameters } : item
    )));
  };

  return (
    <>
      <h6>{t('alice.labels.device-capabilities')}</h6>
      <div className="aliceDeviceSkills">
        <p>{t('alice.labels.device-capabilities-description')}</p>
        <div className="aliceDeviceSkills-grid">
          {capabilities.map((capability, key) => (
            <Fragment key={key}>
              <div>
                <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel">
                  {t('alice.labels.capability')}
                </div>
                <Dropdown
                  value={capability.type}
                  options={Object.keys(Capability).map((cap) => ({
                    label: cap,
                    value: Capability[cap],
                    isDisabled: isCapabilityDisabled(Capability[cap], capabilities),
                  }))}
                  onChange={(option: Option<Capability>) => onCapabilityTypeChange(option.value, key)}
                />
              </div>
              <div>
                <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel">
                  {t('alice.labels.topic')}
                </div>
                <Dropdown
                  value={capability.mqtt}
                  placeholder={deviceStore.topics.flatMap((g) => g.options)
                    .find((o) => o.value === capability.mqtt)?.label}
                  options={deviceStore.topics as any[]}
                  isSearchable
                  onChange={({ value }: Option<string>) => {
                    onCapabilityChange(capabilities.map((item, i) => (
                      i === key ? { ...item, mqtt: value } : item
                    )));
                  }}
                />
              </div>

              {capability.type === Capability['On/Off'] && (
                <div className="aliceDeviceSkills-colspan2"></div>
              )}

              {capability.type === Capability['Color setting'] && (
                <>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.type')}</div>
                    <Dropdown
                      value={getCurrentColorModel(capability)}
                      options={getColorModelOptions(capability, key)}
                      onChange={({ value }: Option<Color>) => {
                        handleColorSettingTypeChange(value, key);
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
                          handleColorModelInstanceChange(value, key);
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
                            handleTemperatureParameterChange('min', min, key);
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
                            handleTemperatureParameterChange('max', max, key);
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
                          handleColorScenesChange(scenes, key);
                        }}
                      />
                    </div>
                  )}
                </>

              )}

              {/* TODO: <DISABLED_MODE> - need uncomment for Mode activation in WEBUI */}
              {/* {capability.type === Capability.Mode && (
                <>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mode-type')}</div>
                    <Dropdown
                      value={capability.parameters?.instance}
                      options={modes.map((mode) => ({ label: mode, value: mode }))}
                      onChange={({ value: instance }: Option<string>) => {
                        const val = capabilities.map((item, i) => i === key
                          ? { ...item, parameters: { ...item.parameters, instance } }
                          : item);
                        onCapabilityChange(val);
                      }}
                    />
                  </div>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mode')}</div>
                    <Input
                      value={capability.parameters?.modes}
                      isFullWidth
                      onChange={(modes: string) => {
                        const val = capabilities.map((item, i) => i === key
                          ? { ...item, parameters: { ...item.parameters, modes } }
                          : item);
                        onCapabilityChange(val);
                      }}
                    />
                  </div>
                </>
              )} */}

              {capability.type === Capability.Range && (
                <>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mode')}</div>
                    <Dropdown
                      value={capability.parameters?.instance}
                      options={getRangeInstanceOptions(capability, key)}
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
                          i === key ? { ...item, parameters: nextParams } : item
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
                                const val = capabilities.map((item, i) => (
                                  i === key
                                    ? {
                                      ...item,
                                      parameters: {
                                        ...item.parameters,
                                        range: { ...item.parameters.range, min },
                                      },
                                    }
                                    : item
                                ));
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
                                const val = capabilities.map((item, i) => (
                                  i === key
                                    ? {
                                      ...item,
                                      parameters: {
                                        ...item.parameters,
                                        range: { ...item.parameters.range, max },
                                      },
                                    }
                                    : item
                                ));
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
                                const val = capabilities.map((item, i) => i === key
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
              )}

              {/* <DISABLED_TOGGLE> - need uncomment for Toggle activation in WEBUI */}
              {/* {capability.type === Capability.Toggle && (
                <div className="aliceDeviceSkills-colspan2">
                  <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mode')}</div>
                  <Dropdown
                    value={capability.parameters?.instance}
                    options={toggles.map((toggle) => ({ label: toggle, value: toggle }))}
                    onChange={({ value: instance }: Option<string>) => {
                      const val = capabilities.map((item, i) => i === key
                        ? { ...item, parameters: { ...item.parameters, instance } }
                        : item);
                      onCapabilityChange(val);
                    }}
                  />
                </div>
              )} */}

              <div className="aliceDeviceSkills-deleteButton">
                <Button
                  size="small"
                  type="button"
                  icon={<TrashIcon />}
                  variant="secondary"
                  isOutlined
                  onClick={() => onCapabilityChange(capabilities.filter((_item, i) => i !== key))}
                />
              </div>
            </Fragment>
          ))}
        </div>

        <Button
          className="aliceDeviceSkills-addButton"
          label={t('alice.buttons.add-capability')}
          disabled={!getAvailableCapabilities().length}
          onClick={() => {
            const type = getAvailableCapabilities().at(0);
            onCapabilityChange([...capabilities, { type, mqtt: '', parameters: getCapabilityParameters(type) }]);
          }}
        />
      </div>
    </>
  );
});
