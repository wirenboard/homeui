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

const getAvailableColorModelsForCapability = (capabilities: SmartDeviceCapability[], currentIndex: number) => {
  const usedColorModels = capabilities
    .filter((cap, index) => cap.type === Capability['Color setting'] && index !== currentIndex)
    .map(cap => {
      // Think what type colour model by parameters structure
      if (cap.parameters?.color_model?.instance === 'rgb') return Color.RGB;
      if (cap.parameters?.color_model?.instance === 'hsv') return Color.HSV; // <!-- HSV_SCENES_SUPPORT -->
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
      // Think what type colour model by parameters structure
      if (cap.parameters?.color_model?.instance === 'rgb') return Color.RGB;
      if (cap.parameters?.color_model?.instance === 'hsv') return Color.HSV; // <!-- HSV_SCENES_SUPPORT -->
      if (cap.parameters?.temperature_k) return Color.TEMPERATURE_K;
      if (cap.parameters?.color_scene) return Color.COLOR_SCENE; // <!-- HSV_SCENES_SUPPORT -->
      return null;
    })
    .filter(Boolean);
  
  return Object.values(Color).filter(colorModel => !usedColorModels.includes(colorModel));
};

const getCurrentColorModel = (capability: SmartDeviceCapability) => {
  if (capability.parameters?.color_model?.instance === 'rgb') return Color.RGB;
  if (capability.parameters?.color_model?.instance === 'hsv') return Color.HSV; // <!-- HSV_SCENES_SUPPORT -->
  if (capability.parameters?.temperature_k) return Color.TEMPERATURE_K;
  if (capability.parameters?.color_scene) return Color.COLOR_SCENE; // <!-- HSV_SCENES_SUPPORT -->
  return Color.RGB; // Default value
};

const getColorModelLabel = (colorKey: string) => {
  switch (colorKey) {
    case 'RGB': return 'RGB';
    case 'HSV': return 'HSV'; // <!-- HSV_SCENES_SUPPORT -->
    case 'TEMPERATURE_K': return 'Цветовая температура';
    case 'COLOR_SCENE': return 'Цветовые сцены'; // <!-- HSV_SCENES_SUPPORT -->
    default: return colorKey;
  }
};

const getMqttFromColorCapability = (capability: SmartDeviceCapability) => {
  if (capability.parameters?.color_model?.mqtt) return capability.parameters.color_model.mqtt;
  if (capability.parameters?.temperature_k?.mqtt) return capability.parameters.temperature_k.mqtt;
  if (capability.parameters?.color_scene?.mqtt) return capability.parameters.color_scene.mqtt; // <!-- HSV_SCENES_SUPPORT -->
  return '';
};

const isCapabilityDisabled = (capabilityType: Capability, capabilities: SmartDeviceCapability[]) => {
  if (capabilityType === Capability['Color setting']) {
    // For color setting, disable only if all color models are used
    return getAvailableColorModels(capabilities).length === 0;
  }
  
  // For other capabilities, use existing logic
  return capabilities.find((item) => item.type === capabilityType);
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
        const selectedModel = availableColorModels[0] || Color.RGB;
        
        // Generate correct structure for current model
        if (selectedModel === Color.RGB) {
          parameters.color_model = { instance: 'rgb', mqtt: '' };
        } else if (selectedModel === Color.HSV) { // <!-- HSV_SCENES_SUPPORT -->
          parameters.color_model = { instance: 'hsv', mqtt: '' }; // <!-- HSV_SCENES_SUPPORT -->
        } else if (selectedModel === Color.TEMPERATURE_K) {
          parameters.temperature_k = { min: 2700, max: 6500, mqtt: '' };
        } else if (selectedModel === Color.COLOR_SCENE) { // <!-- HSV_SCENES_SUPPORT -->
          parameters.color_scene = { scenes: [], mqtt: '' }; // <!-- HSV_SCENES_SUPPORT -->
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
        break;
      }
      case Capability.Toggle: {
        parameters.instance = 'backlight';
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
                      const val = capabilities.map((item, i) => {
                        if (i !== key) return item;
                        
                        let newParameters = { ...item.parameters };
                        if (newParameters.color_model) {
                          newParameters.color_model = { ...newParameters.color_model, mqtt: value };
                        }
                        if (newParameters.temperature_k) {
                          newParameters.temperature_k = { ...newParameters.temperature_k, mqtt: value };
                        }
                        if (newParameters.color_scene) { // <!-- HSV_SCENES_SUPPORT -->
                          newParameters.color_scene = { ...newParameters.color_scene, mqtt: value }; // <!-- HSV_SCENES_SUPPORT -->
                        }
                        
                        return { ...item, mqtt: '', parameters: newParameters };
                      });
                      onCapabilityChange(val);
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
                // <div className="aliceDeviceSkills-colspan2">
                //   <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.type')}</div>
                //   <Dropdown
                //     value={capability.parameters?.color_model}
                //     options={Object.keys(Color).map((color) => ({ label: color, value: Color[color] }))}
                //     onChange={({ value }: Option<Color>) => {
                //       const val = capabilities.map((item, i) => i === key
                //         ? { ...item, parameters: { color_model: value } }
                //         : item);
                //       onCapabilityChange(val);
                //     }}
                //   />
                // </div>
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
                        let newParameters: CapabilityParameters = {};
                        const currentMqtt = getMqttFromColorCapability(capability);
                        
                        // Generate correct parameters structure
                        if (value === Color.RGB) {
                          newParameters.color_model = { instance: 'rgb', mqtt: currentMqtt };
                        } else if (value === Color.HSV) { // <!-- HSV_SCENES_SUPPORT -->
                          newParameters.color_model = { instance: 'hsv', mqtt: currentMqtt }; // <!-- HSV_SCENES_SUPPORT -->
                        } else if (value === Color.TEMPERATURE_K) {
                          newParameters.temperature_k = { min: 2700, max: 6500, mqtt: currentMqtt };
                        } else if (value === Color.COLOR_SCENE) { // <!-- HSV_SCENES_SUPPORT -->
                          newParameters.color_scene = { scenes: [], mqtt: currentMqtt }; // <!-- HSV_SCENES_SUPPORT -->
                        }
                        
                        const val = capabilities.map((item, i) => i === key
                          ? { ...item, parameters: newParameters }
                          : item);
                        onCapabilityChange(val);
                      }}
                    />
                  </div>
                     
                  {/* For RGB and HSV show empty cell */}
                  {(getCurrentColorModel(capability) === Color.RGB || 
                    getCurrentColorModel(capability) === Color.HSV) && ( // <!-- HSV_SCENES_SUPPORT -->
                    <div></div>
                  )}
                  
                  {/* For temperature_k show fields min/max */}
                  {capability.parameters?.temperature_k && (
                    <div className="aliceDeviceSkills-gridRange">
                      <div>
                        <div className="aliceDeviceSkills-gridLabel">{t('alice.labels.min')}</div>
                        <Input
                          value={capability.parameters?.temperature_k?.min}
                          type="number"
                          isFullWidth
                          onChange={(min: number) => {
                            const val = capabilities.map((item, i) => i === key
                              ? { 
                                  ...item, 
                                  parameters: { 
                                    ...item.parameters, 
                                    temperature_k: { 
                                      ...item.parameters.temperature_k, 
                                      min,
                                      mqtt: item.parameters.temperature_k?.mqtt || ''
                                    }
                                  } 
                                }
                              : item);
                            onCapabilityChange(val);
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
                            const val = capabilities.map((item, i) => i === key
                              ? { 
                                  ...item, 
                                  parameters: { 
                                    ...item.parameters, 
                                    temperature_k: { 
                                      ...item.parameters.temperature_k, 
                                      max,
                                      mqtt: item.parameters.temperature_k?.mqtt || ''
                                    }
                                  } 
                                }
                              : item);
                            onCapabilityChange(val);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* For color scenes show empty cell or scene input */}
                  {getCurrentColorModel(capability) === Color.COLOR_SCENE && ( // <!-- HSV_SCENES_SUPPORT -->
                    <div></div> // <!-- HSV_SCENES_SUPPORT -->
                  )}
                </>

              )}

              {/* <!-- HSV_SCENES_SUPPORT --> */}
              {/* For colour scenes show field for input scenes */}
              {/* {capability.parameters?.color_scene && (
                <div>
                  <div className="aliceDeviceSkills-gridLabel">Сцены (через запятую)</div>
                  <Input
                    value={capability.parameters?.color_scene?.scenes?.join(', ') || ''}
                    isFullWidth
                    placeholder="ocean, sunset, party"
                    onChange={(scenes: string) => {
                      const sceneList = scenes.split(',').map(s => s.trim()).filter(Boolean);
                      const val = capabilities.map((item, i) => i === key
                        ? { 
                            ...item, 
                            parameters: { 
                              ...item.parameters, 
                              color_scene: { 
                                ...item.parameters.color_scene, 
                                scenes: sceneList 
                              } 
                            } 
                          }
                        : item);
                      onCapabilityChange(val);
                    }}
                  />
                </div>
              )} */}
              {/* <!-- HSV_SCENES_SUPPORT --> */}

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
                        const val = capabilities.map((item, i) => i === key
                          ? { ...item, parameters: { ...item.parameters, instance } }
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
                        onChange={(max: number) => {
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
                        onChange={(precision: number) => {
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
