import { observer } from 'mobx-react-lite';
import { Fragment, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import {
  Capability,
  Color,
  ColorModel,
  events,
  floats,
  modes,
  Property,
  ranges,
  toggles,
  floatUnitsByInstance,
  type CapabilityParameters,
  type PropertyParameters,
  type SmartDeviceCapability,
  colorSceneOptions,
  unitLabels,
  rangeUnitByInstance,
  defaultColorModelParameters,
  defaultTemperatureParameters,
  defaultColorSceneParameters
} from '@/stores/alice';
import type { DeviceSkillsParams } from './types';
import './styles.css';

const unitOptionsForInstance = (instance?: string): Option<string>[] => {
  const list = (instance && floatUnitsByInstance[instance]) || [];
  return list.map((u) => ({ label: unitLabels[u] ?? u, value: u }));
};

const getAvailableColorModels = (
  capabilities: SmartDeviceCapability[],
  excludeIndex?: number
): Color[] => {
  // Collect already used Color categories among color-setting capabilities
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
    .filter((m) => m !== Color.ColorScene) // This line disable Color scene, need remove for enable <COLOR_SKILL>
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

// Returns float instances that are unused or belong to current property
const getAvailableFloatInstances = (
  properties: any[],
  currentPropertyIndex?: number
) => {
  const usedInstances = new Set(
    properties
      .filter((property) => property.type === Property.Float)
      .map((property) => property?.parameters?.instance)
      .filter(Boolean) as string[]
  );
  const currentInstance = typeof currentPropertyIndex === 'number'
    ? properties[currentPropertyIndex]?.parameters?.instance
    : undefined;

  return floats.filter((instance) => {
    const isUnused = !usedInstances.has(instance);
    const isCurrentSelection = instance === currentInstance;

    return isUnused || isCurrentSelection;
  });
};

const isCapabilityDisabled = (
  capabilityType: Capability,
  capabilities: SmartDeviceCapability[]
) => {
  if (capabilityType === Capability['Color setting']) {
    // For color setting, disable only if all color models are used
    return !getAvailableColorModels(capabilities).length;
  }

  // For other capabilities, use existing logic
  return capabilities.find((item) => item.type === capabilityType);
};

export const DeviceSkills = observer(({
  capabilities, properties, deviceStore, onCapabilityChange, onPropertyChange,
}: DeviceSkillsParams) => {
  const { t } = useTranslation();

  const handleColorSettingTypeChange = useCallback((
    value: Color,
    capabilities: SmartDeviceCapability[],
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
    capabilities: SmartDeviceCapability[],
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
    capabilities: SmartDeviceCapability[],
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
    capabilities: SmartDeviceCapability[],
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

  // Creates color model dropdown with used models disabled
  const getColorModelOptions = useMemo(() => {
    return (currentCapability: SmartDeviceCapability, currentCapabilityIndex: number) => {
      const availableModels = getAvailableColorModels(capabilities, currentCapabilityIndex);
      const currentlySelectedModel = getCurrentColorModel(currentCapability);

      return Object.keys(Color)
        .filter((colorKey) => colorKey !== 'ColorScene') // This line disable Color scene, need remove for enable <COLOR_SKILL>
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

  // Creates float instance dropdown with used instances disabled
  const getFloatInstanceOptions = useMemo(() => {
    return (currentProperty: any, currentPropertyIndex: number) => {
      const availableInstances = getAvailableFloatInstances(properties, currentPropertyIndex);
      const currentlySelectedInstance = currentProperty?.parameters?.instance;

      return floats.map((instanceKey) => {
        const isCurrentlySelected = currentlySelectedInstance === instanceKey;
        const isAvailableForUse = availableInstances.includes(instanceKey);

        return {
          label: instanceKey,
          value: instanceKey,
          isDisabled: !isCurrentlySelected && !isAvailableForUse,
        };
      });
    };
  }, [properties]);

  // Handles Float property instance change and automatically compatible units
  const handleFloatInstanceChange = useCallback((
    newInstance: string,
    currentPropertyIndex: number
  ) => {
    const currentProperty = properties[currentPropertyIndex];
    const availableUnits = unitOptionsForInstance(newInstance).map((o) => o.value);
    const currentlySelectedUnit = currentProperty?.parameters?.unit;

    const updatedParams: PropertyParameters = {
      ...currentProperty.parameters,
      instance: newInstance,
    };

    if (availableUnits.length) {
      const nextUnit = availableUnits.includes(currentlySelectedUnit)
        ? currentlySelectedUnit
        : availableUnits[0];
      updatedParams.unit = nextUnit;
    } else {
      // If units not present - remove unit fields
      delete (updatedParams as any).unit;
    }

    const updatedProperties = properties.map((item, i) =>
      i === currentPropertyIndex ? { ...item, parameters: updatedParams } : item
    );

    onPropertyChange(updatedProperties);
  }, [properties, onPropertyChange]);

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
      // <DISABLED_MODE> - need uncomment for Mode activation in WEBUI
      // case Capability.Mode: {
      //   parameters.instance = 'wet_cleaning';
      //   parameters.modes = 'start=1, stop=0';
      //   break;
      // }
      case Capability.Range: {
        parameters.instance = 'brightness';
        parameters.range = {
          min: 0,
          max: 100,
          precision: 1,
        };
        parameters.unit = rangeUnitByInstance['brightness'];
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

  const getPropertyParameters = (type: Property) => {
    const parameters: PropertyParameters = {};
    switch (type) {
      case Property.Float: {
        const inst = floats.at(0);
        parameters.instance = inst;
        const units = unitOptionsForInstance(inst).map((o) => o.value);
        // Add default unit for first instance only if float type units present
        if (units.length) {
          parameters.unit = units[0];
        }
        break;
      }
      // <DISABLED_EVENT> - need uncomment for Event activation in WEBUI
      // case Property.Event: {
      //   parameters.instance = events.at(0);
      //   parameters.value = 'открыто';
      //   break;
      // }
    }
    return parameters;
  };

  const onCapabilityTypeChange = (type: Capability, key: number) => {
    const parameters = getCapabilityParameters(type);
    onCapabilityChange(capabilities.map((item, i) => (
      i === key ? { ...item, type, parameters } : item
    )));
  };

  const onPropertyTypeChange = (type: Property, key: number) => {
    const parameters = getPropertyParameters(type);
    onPropertyChange(properties.map((item, i) => (
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
                        handleColorSettingTypeChange(value, capabilities, key);
                      }}
                    />
                  </div>

                  {/* For colour model - show select RGB/HSV */}
                  {getCurrentColorModel(capability) === Color.ColorModel && (
                    <div>
                      <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.color-model')}</div>
                      <Dropdown
                        value={capability.parameters?.color_model ?? null}
                        options={Object.keys(ColorModel)
                          .filter((m) => m !== 'HSV' || capability.parameters?.color_model === ColorModel.HSV) // This line disable HSV, need remove for enable <COLOR_SKILL>
                          .map((model) => ({
                            label: model,
                            value: ColorModel[model as keyof typeof ColorModel],
                          }))}
                        onChange={({ value }: Option<ColorModel>) => {
                          handleColorModelInstanceChange(value, capabilities, key);
                        }}
                      />
                    </div>
                  )}

                  {/* For temperature_k - show fields min/max */}
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
                            handleTemperatureParameterChange('min', min, capabilities, key);
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
                            handleTemperatureParameterChange('max', max, capabilities, key);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* For colour scenes show field for input scenes */}
                  {getCurrentColorModel(capability) === Color.ColorScene && (
                    <div>
                      <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.scenes-input')}</div>
                      <Input
                        value={capability.parameters?.color_scene?.scenes?.join(', ') || ''}
                        placeholder="ocean, sunset, party"
                        isFullWidth
                        onChange={(scenes: string) => {
                          handleColorScenesChange(scenes, capabilities, key);
                        }}
                      />
                    </div>
                  )}
                </>

              )}

              {/* <DISABLED_MODE> - need uncomment for Mode activation in WEBUI */}
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
                      options={ranges.map((range) => ({ label: range, value: range }))}
                      onChange={({ value: instance }: Option<string>) => {
                        const unit = rangeUnitByInstance[instance];
                        const val = capabilities.map((item, i) => i === key
                          ? { ...item, parameters: { ...item.parameters, instance, unit } }
                          : item);
                        onCapabilityChange(val);
                      }}
                    />
                  </div>
                  <div className="aliceDeviceSkills-gridRange">
                    <div>
                      <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.min')}</div>
                      <Input
                        value={capability.parameters?.range.min}
                        type="number"
                        isFullWidth
                        onChangeEvent={(event) => {
                          const min = event.currentTarget.valueAsNumber || 0;
                          const val = capabilities.map((item, i) => i === key
                            ? { ...item, parameters: { ...item.parameters, range: { ...item.parameters.range, min } } }
                            : item);
                          onCapabilityChange(val);
                        }}
                      />
                    </div>
                    <div>
                      <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.max')}</div>
                      <Input
                        value={capability.parameters?.range.max}
                        type="number"
                        isFullWidth
                        onChangeEvent={(event) => {
                          const max = event.currentTarget.valueAsNumber || 0;
                          const val = capabilities.map((item, i) => i === key
                            ? { ...item, parameters: { ...item.parameters, range: { ...item.parameters.range, max } } }
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

        <br/>
        <p>{t('alice.labels.device-properties-description')}</p>
        <div className="aliceDeviceSkills-grid">
          {properties.map((property, key) => (
            <Fragment key={key}>
              <div>
                <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel">
                  {t('alice.labels.property')}
                </div>
                <Dropdown
                  value={property.type}
                  options={Object.keys(Property).map((prop) => ({ label: prop, value: Property[prop] }))}
                  onChange={(option: Option<Property>) => onPropertyTypeChange(option.value, key)}
                />
              </div>

              {property.type === Property.Float && (
                <>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel">
                      {t('alice.labels.property-settings')}
                    </div>
                    <Dropdown
                      value={property.parameters?.instance}
                      options={getFloatInstanceOptions(property, key)}
                      onChange={({ value: instance }: Option<string>) =>
                        handleFloatInstanceChange(instance, key)
                      }
                    />
                  </div>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel"></div>
                    {unitOptionsForInstance(property.parameters?.instance).length ? (
                      <Dropdown
                        value={property.parameters?.unit}
                        options={unitOptionsForInstance(property.parameters?.instance)}
                        onChange={({ value: unit }: Option<string>) => {
                          const val = properties.map((item, i) => i === key
                            ? { ...item, parameters: { ...item.parameters, unit } }
                            : item);
                          onPropertyChange(val);
                        }}
                      />
                    ) : (
                      <div className="aliceDeviceSkills-noUnits">
                        {t('alice.labels.no-units')}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* <DISABLED_EVENT> - need uncomment for Event activation in WEBUI */}
              {/* {property.type === Property.Event && (
                <>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel">
                      {t('alice.labels.property-settings')}
                    </div>
                    <Dropdown
                      value={property.parameters?.instance}
                      options={events.map((event) => ({ label: event, value: event }))}
                      onChange={({ value: instance }: Option<string>) => {
                        const val = properties.map((item, i) => i === key
                          ? { ...item, parameters: { ...item.parameters, instance } }
                          : item);
                        onPropertyChange(val);
                      }}
                    />
                  </div>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel"></div>
                    <Input
                      value={property.parameters?.value}
                      isFullWidth
                      onChange={(value: string) => {
                        const val = properties.map((item, i) => i === key
                          ? { ...item, parameters: { ...item.parameters, value } }
                          : item);
                        onPropertyChange(val);
                      }}
                    />
                  </div>
                </>
              )} */}

              <div>
                <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel">
                  {t('alice.labels.topic')}
                </div>
                <Dropdown
                  value={property.mqtt}
                  placeholder={deviceStore.topics.flatMap((g) => g.options)
                    .find((o) => o.value === property.mqtt)?.label}
                  options={deviceStore.topics as any[]}
                  isSearchable
                  onChange={({ value }: Option<string>) => {
                    onPropertyChange(properties.map((item, i) => i === key ? { ...item, mqtt: value } : item));
                  }}
                />
              </div>

              <div className="aliceDeviceSkills-deleteButton">
                <Button
                  size="small"
                  type="button"
                  icon={<TrashIcon />}
                  variant="secondary"
                  isOutlined
                  onClick={() => onPropertyChange(properties.filter((_item, i) => i !== key))}
                />
              </div>
            </Fragment>
          ))}
          {(() => {
            const free = getAvailableFloatInstances(properties);
            return (
              <Button
                className="aliceDeviceSkills-addButton"
                label={t('alice.buttons.add-property')}
                disabled={!free.length}
                onClick={() => {
                  const inst = free[0];
                  const units = unitOptionsForInstance(inst).map((o) => o.value);
                  const params: PropertyParameters = { instance: inst };
                  if (units.length) params.unit = units[0];
                  onPropertyChange([
                    ...properties,
                    { type: Property.Float, mqtt: '', parameters: params },
                  ]);
                }}
              />
            );
          })()}
        </div>
      </div>
    </>
  );
});
