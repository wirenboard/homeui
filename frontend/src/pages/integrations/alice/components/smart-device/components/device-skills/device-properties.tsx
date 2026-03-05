import { observer } from 'mobx-react-lite';
import { Fragment, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import {
  events,
  floats,
  Property,
  floatUnitsByInstance,
  valueEventsByInstance,
  valueLabels,
  type PropertyParameters,
  unitLabels,
} from '@/stores/alice';
import { type DevicePropertiesProps } from './types';

const floatUnitOptionsForInstance = (instance?: string): Option<string>[] => {
  const list = (instance && floatUnitsByInstance[instance]) || [];
  return list.map((u) => ({ label: unitLabels[u] ?? u, value: u }));
};

const eventValueOptionsForInstance = (instance?: string): Option<string>[] => {
  const list = (instance && valueEventsByInstance[instance]) || [];
  return list.map((u) => ({ label: valueLabels[u] ?? u, value: u }));
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

// Returns event instances that still have available values
const getAvailableEventInstances = (properties: any[]) => {
  return events.filter((instance) => {
    const availableValues = valueEventsByInstance[instance] || [];
    if (availableValues.length === 0) return false;

    const usedValues = new Set(
      properties
        .filter((p) => p.type === Property.Event && p.parameters?.instance === instance)
        .map((p) => p.parameters?.value)
        .filter(Boolean) as string[]
    );

    // Instance has available values if not all values are used
    return usedValues.size < availableValues.length;
  });
};

export const DeviceProperties = observer(({
  properties, devicesStore, onPropertyChange,
}: DevicePropertiesProps) => {
  const { t } = useTranslation();

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

  // Options for Event "event-value" dropdown: keep all values but disable already used ones
  const getEventValueOptions = useCallback((instance?: string, currentPropertyIndex?: number) => {
    const allOptions = eventValueOptionsForInstance(instance);
    if (!instance) return allOptions;

    const usedValues = new Set(
      properties
        .filter((p, i) => p.type === Property.Event
          && p.parameters?.instance === instance
          && i !== currentPropertyIndex)
        .map((p) => p.parameters?.value)
        .filter(Boolean) as string[]
    );

    return allOptions.map((opt) => ({
      ...opt,
      isDisabled: usedValues.has(opt.value),
    }));
  }, [properties]);

  const handleFloatInstanceChange = useCallback((
    newInstance: string,
    currentPropertyIndex: number
  ) => {
    const currentProperty = properties[currentPropertyIndex];
    const availableUnits = floatUnitOptionsForInstance(newInstance).map((o) => o.value);
    const currentlySelectedUnit = currentProperty?.parameters?.unit;

    const updatedParams: PropertyParameters = {
      ...currentProperty.parameters,
      instance: newInstance,
    };

    if (availableUnits.length) {
      updatedParams.unit = availableUnits.includes(currentlySelectedUnit)
        ? currentlySelectedUnit
        : availableUnits[0];
    } else {
      // If units not present - remove unit fields
      delete (updatedParams as any).unit;
    }

    const updatedProperties = properties.map((item, i) =>
      i === currentPropertyIndex ? { ...item, parameters: updatedParams } : item
    );

    onPropertyChange(updatedProperties);
  }, [properties, onPropertyChange]);

  const handleEventInstanceChange = useCallback((
    newInstance: string,
    currentPropertyIndex: number
  ) => {
    const currentProperty = properties[currentPropertyIndex];
    const options = getEventValueOptions(newInstance, currentPropertyIndex);
    const enabledValues = options.filter((o: any) => !o.isDisabled).map((o) => o.value);
    const currentValue = currentProperty.parameters?.value;
    const nextValue = enabledValues.includes(currentValue) ? currentValue : (enabledValues[0] ?? null);

    const updatedParams = {
      ...currentProperty.parameters,
      instance: newInstance,
      value: nextValue,
    };
    if ((updatedParams as any).unit) delete (updatedParams as any).unit;

    onPropertyChange(properties.map((item, i) => i === currentPropertyIndex
      ? { ...item, parameters: updatedParams }
      : item));
  }, [properties, onPropertyChange, getEventValueOptions]);

  const getPropertyParameters = (type: Property, currentPropertyIndex?: number) => {
    const parameters: PropertyParameters = {};
    switch (type) {
      case Property.Float: {
        const inst = floats.at(0);
        parameters.instance = inst;
        const units = floatUnitOptionsForInstance(inst).map((o) => o.value);
        // Add default unit for first instance only if float type units present
        if (units.length) {
          parameters.unit = units[0];
        }
        break;
      }
      case Property.Event: {
        // Find first event instance that has available values
        const freeEventInstances = getAvailableEventInstances(properties);
        const inst = freeEventInstances.length > 0 ? freeEventInstances[0] : events.at(0);

        parameters.instance = inst;
        const units = eventValueOptionsForInstance(inst).map((o) => o.value);
        if (units.length) {
          // compute used event-values for this instance excluding current property index
          const usedValues = new Set(
            properties
              .filter((p, i) => p.type === Property.Event
                && p.parameters?.instance === inst
                && i !== currentPropertyIndex)
              .map((p) => p.parameters?.value)
              .filter(Boolean) as string[]
          );

          // pick first unit that is not used yet
          const firstAvailable = units.find((u) => !usedValues.has(u));
          if (firstAvailable) {
            parameters.value = firstAvailable;
          }
        }
        break;
      }
    }
    return parameters;
  };

  const onPropertyTypeChange = (type: Property, key: number) => {
    const parameters = getPropertyParameters(type, key);
    onPropertyChange(properties.map((item, i) => (
      i === key ? { ...item, type, parameters } : item
    )));
  };

  return (
    <>
      <h6>{t('alice.labels.device-properties')}</h6>
      <div className="aliceDeviceSkills">
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
                  className="aliceDeviceSkills-dropdown"
                  value={property.mqtt}
                  placeholder={devicesStore.topics.flatMap((g) => g.options)
                    .find((o) => o.value === property.mqtt)?.label}
                  options={devicesStore.topics as any[]}
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
                      options={getFloatInstanceOptions(property, key)}
                      onChange={({ value: instance }: Option<string>) =>
                        handleFloatInstanceChange(instance, key)
                      }
                    />
                  </div>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel"></div>
                    {floatUnitOptionsForInstance(property.parameters?.instance).length ? (
                      <Dropdown
                        value={property.parameters?.unit}
                        options={floatUnitOptionsForInstance(property.parameters?.instance)}
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

              {property.type === Property.Event && (
                <>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel">
                      {t('alice.labels.property-settings')}
                    </div>
                    <Dropdown
                      value={property.parameters?.instance}
                      options={events.map((event) => ({ label: event, value: event }))}
                      onChange={({ value: instance }: Option<string>) =>
                        handleEventInstanceChange(instance, key)
                      }
                    />
                  </div>
                  <div>
                    <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel">
                      {t('alice.labels.event-value')}
                    </div>
                    {getEventValueOptions(property.parameters?.instance, key).length ? (
                      <Dropdown
                        value={property.parameters?.value}
                        options={getEventValueOptions(property.parameters?.instance, key)}
                        onChange={({ value }: Option<string>) => {
                          const val = properties.map((item, i) => i === key
                            ? { ...item, parameters: { ...item.parameters, value } }
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
        {(() => {
          const freeFloatInstances = getAvailableFloatInstances(properties);
          const freeEventInstances = getAvailableEventInstances(properties);
          const canAddProperty = freeFloatInstances.length > 0 || freeEventInstances.length > 0;

          return (
            <Button
              className="aliceDeviceSkills-addButton"
              label={t('alice.buttons.add-property')}
              disabled={!canAddProperty}
              onClick={() => {
                if (freeFloatInstances.length > 0) {
                  // Add Float property
                  const inst = freeFloatInstances[0];
                  const units = floatUnitOptionsForInstance(inst).map((o) => o.value);
                  const params: PropertyParameters = { instance: inst };
                  if (units.length) params.unit = units[0];
                  onPropertyChange([
                    ...properties,
                    { type: Property.Float, mqtt: '', parameters: params },
                  ]);
                } else if (freeEventInstances.length > 0) {
                  // Add Event property with first available instance
                  const inst = freeEventInstances[0];
                  const availableValues = eventValueOptionsForInstance(inst).map((o) => o.value);
                  const usedValues = new Set(
                    properties
                      .filter((p) => p.type === Property.Event && p.parameters?.instance === inst)
                      .map((p) => p.parameters?.value)
                      .filter(Boolean) as string[]
                  );
                  const firstAvailableValue = availableValues.find((v) => !usedValues.has(v));

                  const params: PropertyParameters = { instance: inst };
                  if (firstAvailableValue) {
                    params.value = firstAvailableValue;
                  }

                  onPropertyChange([
                    ...properties,
                    { type: Property.Event, mqtt: '', parameters: params },
                  ]);
                }
              }}
            />
          );
        })()}
      </div>
    </>
  );
});
