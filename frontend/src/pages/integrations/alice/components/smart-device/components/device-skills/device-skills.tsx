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
  type PropertyParameters
} from '@/stores/alice';
import type { DeviceSkillsParams } from './types';
import './styles.css';

export const DeviceSkills = observer(({
  capabilities, properties, deviceStore, onCapabilityChange, onPropertyChange,
}: DeviceSkillsParams) => {
  const { t } = useTranslation();

  const getCapabilityParameters = (type: Capability) => {
    const parameters: CapabilityParameters = {};
    switch (type) {
      case Capability['Color setting']: {
        parameters.color_model = Color.RGB;
        // Add parameters for different types:
        // - For RGB - no additional params needed
        // - For temperature_k - params added when user changes color_model
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
                    isDisabled: capabilities.find((item) => item.type === Capability[cap]),
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
                    onCapabilityChange(capabilities.map((item, i) => i === key ? { ...item, mqtt: value } : item));
                  }}
                />
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
                      value={capability.parameters?.color_model}
                      options={Object.keys(Color).map((color) => ({ 
                        label: color === 'RGB' ? 'RGB' : 'Цветовая температура', 
                        value: Color[color] 
                      }))}
                      onChange={({ value }: Option<Color>) => {
                        let newParameters: CapabilityParameters = { color_model: value };
                        
                        // Если выбрана цветовая температура, добавляем поля temperature_k
                        if (value === Color.TEMPERATURE_K) {
                          newParameters.temperature_k = { min: 2700, max: 6500 };
                        }
                        
                        const val = capabilities.map((item, i) => i === key
                          ? { ...item, parameters: newParameters }
                          : item);
                        onCapabilityChange(val);
                      }}
                    />
                  </div>
                     
                  {/* Для RGB показываем пустую ячейку */}
                  {capability.parameters?.color_model === Color.RGB && (
                    <div></div>
                  )}
                  
                  {/* Для temperature_k показываем поля мин/макс */}
                  {capability.parameters?.color_model === Color.TEMPERATURE_K && (
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
                                    temperature_k: { ...item.parameters.temperature_k, min } 
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
                                    temperature_k: { ...item.parameters.temperature_k, max } 
                                  } 
                                }
                              : item);
                            onCapabilityChange(val);
                          }}
                        />
                      </div>
                    </div>
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
          disabled={capabilities.length === Object.keys(Capability).length}
          onClick={() => {
            const type = Object.values(Capability)
              .filter((item) => !capabilities.map((cap) => cap.type).includes(item)).at(0);
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
