import { observer } from 'mobx-react-lite';
import { Fragment } from 'react';
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
  type CapabilityParameters,
  type PropertyParameters,
  type SmartDeviceCapability
} from '@/stores/alice';
import type { DeviceSkillsParams } from './types';
import './styles.css';

// Predefined color scenes per Yandex Smart Home docs
const COLOR_SCENE_OPTIONS: Option<string>[] = [
  { label: 'Alarm', value: 'alarm' },
  { label: 'Alice', value: 'alice' },
  { label: 'Candle', value: 'candle' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Fantasy', value: 'fantasy' },
  { label: 'Garland', value: 'garland' },
  { label: 'Jungle', value: 'jungle' },
  { label: 'Movie', value: 'movie' },
  { label: 'Neon', value: 'neon' },
  { label: 'Night', value: 'night' },
  { label: 'Ocean', value: 'ocean' },
  { label: 'Party', value: 'party' },
  { label: 'Reading', value: 'reading' },
  { label: 'Rest', value: 'rest' },
  { label: 'Romance', value: 'romance' },
  { label: 'Siren', value: 'siren' },
];

/**
 * Normalize any value coming from <Input type="number"> to a number
 * - If it's already a finite number: return as is
 * - If it's a string → trim, parse; empty/NaN/Infinity: fallback to 0
 * - Any other type (null/undefined/boolean/object): fallback to 0
 */
function toNumber(inputValue: unknown): number {
  // Already a number (but ensure it's finite)
  if (typeof inputValue === 'number') {
    return Number.isFinite(inputValue) ? inputValue : 0;
  }

  // Typical case for <Input type="number"> — value is a string
  if (typeof inputValue === 'string') {
    const trimmed = inputValue.trim();

    // Treat empty string as 0 to keep JSON numeric
    if (trimmed === '') {
      return 0;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // Fallback for null/undefined/boolean/object/symbol/etc
  return 0;
}

// Range units on this moment hardcoded
// NOTE: any units have only one selection,
//       only temperature have alternative - kelvin, but this is not useful
const RANGE_UNIT_BY_INSTANCE: Record<string, string> = {
  brightness: 'unit.percent',
  humidity: 'unit.percent',
  open: 'unit.percent',
  volume: 'unit.percent',
  temperature: 'unit.temperature.celsius',
  channel: 'unit.channel',
};

const getColorModelType = (capability: SmartDeviceCapability): ColorModel | null => {
  const cm = capability.parameters?.color_model as any;
  if (cm === 'rgb') return ColorModel.RGB;
  if (cm === 'hsv') return ColorModel.HSV; // <!-- HSV_SCENES_SUPPORT -->
  return null;
};

const createColorModelParameters = (model: ColorModel) => ({
  color_model: model,
  instance: model,
});

const createTemperatureParameters = () => ({
  temperature_k: { min: 2700, max: 6500 },
  instance: 'temperature_k',
});

const createColorSceneParameters = () => ({ // <!-- HSV_SCENES_SUPPORT -->
  color_scene: { scenes: [] },
  instance: 'scene',
}); // <!-- HSV_SCENES_SUPPORT -->

const getAvailableColorModelsForCapability = (capabilities: SmartDeviceCapability[], currentIndex: number) => {
  const usedColorModels = capabilities
    .filter((cap, index) => cap.type === Capability['Color setting'] && index !== currentIndex)
    .map(cap => {
      // Select type of color parameter
      if (cap.parameters?.color_model) return Color.COLOR_MODEL;
      if (cap.parameters?.temperature_k) return Color.TEMPERATURE_K;
      if (cap.parameters?.color_scene) return Color.COLOR_SCENE; // <!-- HSV_SCENES_SUPPORT -->
      return null;
    })
    .filter(Boolean);
  
  return Object.values(Color).filter(colorModel => !usedColorModels.includes(colorModel));
};

const getAvailableColorModels = (capabilities: SmartDeviceCapability[]) => {
  const usedColorModels = capabilities
    .filter(cap => cap.type === Capability['Color setting'])
    .map(cap => {
      // Select type of color parameter
      if (cap.parameters?.color_model) return Color.COLOR_MODEL;
      if (cap.parameters?.temperature_k) return Color.TEMPERATURE_K;
      if (cap.parameters?.color_scene) return Color.COLOR_SCENE; // <!-- HSV_SCENES_SUPPORT -->
      return null;
    })
    .filter(Boolean);
  
  return Object.values(Color).filter(colorModel => !usedColorModels.includes(colorModel));
};

const getCurrentColorModel = (capability: SmartDeviceCapability) => {
  if (capability.parameters?.color_model) return Color.COLOR_MODEL;
  if (capability.parameters?.temperature_k) return Color.TEMPERATURE_K;
  if (capability.parameters?.color_scene) return Color.COLOR_SCENE; // <!-- HSV_SCENES_SUPPORT -->
  return Color.COLOR_MODEL; // Default value
};

const getColorModelLabel = (colorKey: string) => {
  switch (colorKey) {
    case 'COLOR_MODEL': return 'Цветовая модель';
    case 'TEMPERATURE_K': return 'Цветовая температура';
    case 'COLOR_SCENE': return 'Цветовые сцены'; // <!-- HSV_SCENES_SUPPORT -->
    default: return colorKey;
  }
};

const getColorModelInstanceLabel = (instance: ColorModel) => {
  switch (instance) {
    case ColorModel.RGB: return 'RGB';
    case ColorModel.HSV: return 'HSV'; // <!-- HSV_SCENES_SUPPORT -->
    default: return instance;
  }
};

const getMqttFromColorCapability = (capability: SmartDeviceCapability) => capability.mqtt || '';

const handleTemperatureParameterChange = (
  paramType: 'min' | 'max',
  value: number,
  capabilities: SmartDeviceCapability[],
  key: number,
  onCapabilityChange: (caps: SmartDeviceCapability[]) => void
) => {
  const val = capabilities.map((item, i) => i === key
    ? {
        ...item,
        parameters: {
          ...item.parameters,
          temperature_k: {
            ...item.parameters.temperature_k,
            [paramType]: value
          },
        }
      }
    : item);
  onCapabilityChange(val);
};

const handleColorScenesChange = (
  scenes: string,
  capabilities: SmartDeviceCapability[],
  key: number,
  onCapabilityChange: (caps: SmartDeviceCapability[]) => void
) => {
  const sceneList = scenes.split(',').map(s => s.trim()).filter(Boolean);
  const val = capabilities.map((item, i) => i === key
    ? {
        ...item,
        parameters: {
          ...item.parameters,
          color_scene: {
            ...item.parameters.color_scene,
            scenes: sceneList
          },
        }
      }
    : item);
  onCapabilityChange(val);
};


const isCapabilityDisabled = (capabilityType: Capability, capabilities: SmartDeviceCapability[]) => {
  if (capabilityType === Capability['Color setting']) {
    // For color setting, disable only if all color models are used
    return getAvailableColorModels(capabilities).length === 0;
  }
  
  // For other capabilities, use existing logic
  return capabilities.find((item) => item.type === capabilityType);
};

const handleColorSettingTypeChange = (
  value: Color,
  capability: SmartDeviceCapability,
  capabilities: SmartDeviceCapability[],
  key: number,
  onCapabilityChange: (caps: SmartDeviceCapability[]) => void
) => {
  let newParameters: CapabilityParameters = {};
  
  if (value === Color.COLOR_MODEL) {
    Object.assign(newParameters, createColorModelParameters(ColorModel.RGB));
  } else if (value === Color.TEMPERATURE_K) {
    Object.assign(newParameters, createTemperatureParameters());
  } else if (value === Color.COLOR_SCENE) { // <!-- HSV_SCENES_SUPPORT -->
    Object.assign(newParameters, createColorSceneParameters()); // <!-- HSV_SCENES_SUPPORT -->
  }
  
  const val = capabilities.map((item, i) => i === key
    ? { ...item, parameters: newParameters }
    : item);
  onCapabilityChange(val);
};

const handleColorModelInstanceChange = (
  value: ColorModel,
  capability: SmartDeviceCapability,
  capabilities: SmartDeviceCapability[],
  key: number,
  onCapabilityChange: (caps: SmartDeviceCapability[]) => void
) => {
  const newParameters = createColorModelParameters(value);
  
  const val = capabilities.map((item, i) => i === key
    ? { ...item, parameters: newParameters }
    : item);
  onCapabilityChange(val);
};


export const DeviceSkills = observer(({
  capabilities, properties, deviceStore, onCapabilityChange, onPropertyChange,
}: DeviceSkillsParams) => {
  const { t } = useTranslation();

  const getAvailableCapabilities = () => {
    const availableCapabilities = Object.values(Capability).filter(capType => {
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
        const selectedModel = availableColorModels[0] || Color.COLOR_MODEL;
        
        // Generate correct structure for current model
        if (selectedModel === Color.COLOR_MODEL) {
          Object.assign(parameters, createColorModelParameters(ColorModel.RGB));
        } else if (selectedModel === Color.TEMPERATURE_K) {
          Object.assign(parameters, createTemperatureParameters());
        } else if (selectedModel === Color.COLOR_SCENE) { // <!-- HSV_SCENES_SUPPORT -->
          Object.assign(parameters, createColorSceneParameters()); // <!-- HSV_SCENES_SUPPORT -->
        }

        break;
      }
      case Capability.Mode: {
        parameters.instance = 'wet_cleaning';
        parameters.modes = 'start=1, stop=0';
        break;
      }
      case Capability.Range: {
        parameters.instance = 'brightness';
        parameters.range = {
          min: 0,
          max: 100,
          precision: 1,
        };
        parameters.unit = RANGE_UNIT_BY_INSTANCE['brightness'];
        break;
      }
      case Capability.Toggle: {
        parameters.instance = 'backlight';
        break;
      }
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
        parameters.instance = floats.at(0);
        parameters.unit = '%';
        break;
      }
      case Property.Event: {
        parameters.instance = events.at(0);
        parameters.value = 'открыто';
        break;
      }
    }
    return parameters;
  };

  const onCapabilityTypeChange = (type: Capability, key: number) => {
    const parameters = getCapabilityParameters(type);
    onCapabilityChange(capabilities.map((item, i) => i === key ? { ...item, type, parameters } : item));
  };

  const onPropertyTypeChange = (type: Property, key: number) => {
    const parameters = getPropertyParameters(type);
    onPropertyChange(properties.map((item, i) => i === key ? { ...item, type, parameters } : item));
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
                {capability.type === Capability['Color setting'] ? (
                  <Dropdown
                    value={getMqttFromColorCapability(capability)}
                    placeholder={deviceStore.topics.flatMap((g) => g.options)
                      .find((o) => o.value === getMqttFromColorCapability(capability))?.label}
                    options={deviceStore.topics as any[]}
                    isSearchable
                    onChange={({ value }: Option<string>) => {
                      onCapabilityChange(capabilities.map((item, i) => (
                        i === key ? { ...item, mqtt: value } : item
                      )));
                    }}
                  />
                ) : (
                  <Dropdown
                    value={capability.mqtt}
                    placeholder={deviceStore.topics.flatMap((g) => g.options)
                      .find((o) => o.value === capability.mqtt)?.label}
                    options={deviceStore.topics as any[]}
                    isSearchable
                    onChange={({ value }: Option<string>) => {
                      onCapabilityChange(capabilities.map((item, i) => i === key ? { ...item, mqtt: value } : item));
                    }}
                  />
                )}
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
                      options={Object.keys(Color).map((color) => {
                        const availableModels = getAvailableColorModelsForCapability(capabilities, key);
                        const currentModel = getCurrentColorModel(capability);
                        const isCurrentModel = currentModel === Color[color];
                        const isAvailable = availableModels.includes(Color[color]);
                        
                        return {
                          label: getColorModelLabel(color),
                          value: Color[color],
                          isDisabled: !isCurrentModel && !isAvailable
                        };
                      })}

                      onChange={({ value }: Option<Color>) => {
                        handleColorSettingTypeChange(value, capability, capabilities, key, onCapabilityChange);
                      }}
                    />
                  </div>

                  {/* For colour model - show select RGB/HSV */}
                  {getCurrentColorModel(capability) === Color.COLOR_MODEL && (
                    <div>
                      <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.color-model')}</div>
                      <Dropdown
                        value={getColorModelType(capability)}
                        options={Object.keys(ColorModel).map((model) => ({
                          label: getColorModelInstanceLabel(ColorModel[model]),
                          value: ColorModel[model],
                        }))}
                        onChange={({ value }: Option<ColorModel>) => {
                          handleColorModelInstanceChange(value, capability, capabilities, key, onCapabilityChange);
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
                          onChange={(min: number) => {
                            handleTemperatureParameterChange('min', toNumber(min), capabilities, key, onCapabilityChange);
                          }}
                        />
                      </div>
                      <div>
                        <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.max')}</div>
                        <Input
                          value={capability.parameters?.temperature_k?.max}
                          type="number"
                          isFullWidth
                          onChange={(max: number) => {
                            handleTemperatureParameterChange('max', toNumber(max), capabilities, key, onCapabilityChange);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* <!-- HSV_SCENES_SUPPORT --> */}
                  {/* For colour scenes show field for input scenes */}
                  {getCurrentColorModel(capability) === Color.COLOR_SCENE && ( // <!-- HSV_SCENES_SUPPORT -->
                    <div>
                      <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.scenes-input')}</div>
                      <Input // <!-- HSV_SCENES_SUPPORT -->
                        value={capability.parameters?.color_scene?.scenes?.join(', ') || ''} // <!-- HSV_SCENES_SUPPORT -->
                        isFullWidth // <!-- HSV_SCENES_SUPPORT -->
                        placeholder="ocean, sunset, party" // <!-- HSV_SCENES_SUPPORT -->
                        onChange={(scenes: string) => { // <!-- HSV_SCENES_SUPPORT -->
                          handleColorScenesChange(scenes, capabilities, key, onCapabilityChange); // <!-- HSV_SCENES_SUPPORT -->
                        }} // <!-- HSV_SCENES_SUPPORT -->
                      />
                    </div> // <!-- HSV_SCENES_SUPPORT -->
                  )}
                </>

              )}

              {capability.type === Capability.Mode && (
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
              )}

              {capability.type === Capability.Range && (
                <>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.mode')}</div>
                    <Dropdown
                      value={capability.parameters?.instance}
                      options={ranges.map((range) => ({ label: range, value: range }))}
                      onChange={({ value: instance }: Option<string>) => {
                        const unit = RANGE_UNIT_BY_INSTANCE[instance];
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
                        onChange={(min: number) => {
                          const n = toNumber(min);
                          const val = capabilities.map((item, i) => i === key
                            ? { ...item, parameters: { ...item.parameters, range: { ...item.parameters.range, min: n } } }
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
                        onChange={(max: number) => {
                          const n = toNumber(max);
                          const val = capabilities.map((item, i) => i === key
                            ? { ...item, parameters: { ...item.parameters, range: { ...item.parameters.range, max: n } } }
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
                        onChange={(precision: number) => {
                          const n = toNumber(precision);
                          const val = capabilities.map((item, i) => i === key
                            ? {
                              ...item,
                              parameters: { ...item.parameters, range: { ...item.parameters.range, precision: n } },
                            }
                            : item);
                          onCapabilityChange(val);
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {capability.type === Capability.Toggle && (
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
              )}

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
          disabled={getAvailableCapabilities().length === 0}
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

              {property.type === Property.Float && (
                <>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel">
                      {t('alice.labels.property-settings')}
                    </div>
                    <Dropdown
                      value={property.parameters?.instance}
                      options={floats.map((float) => ({ label: float, value: float }))}
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
                      value={property.parameters?.unit}
                      isFullWidth
                      onChange={(unit: string) => {
                        const val = properties.map((item, i) => i === key
                          ? { ...item, parameters: { ...item.parameters, unit } }
                          : item);
                        onPropertyChange(val);
                      }}
                    />
                  </div>
                </>
              )}

              {property.type === Property.Event && (
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
              )}

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
        </div>
        <Button
          className="aliceDeviceSkills-addButton"
          label={t('alice.buttons.add-property')}
          onClick={() => {
            const parameters = getPropertyParameters(Property.Float);
            onPropertyChange([...properties, { type: Property.Float, mqtt: '', parameters }]);
          }}
        />
      </div>
    </>
  );
});
