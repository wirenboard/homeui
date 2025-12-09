import { observer } from 'mobx-react-lite';
import { Fragment, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import {
  events, // TODO: <DISABLED_EVENT> - need uncomment for Event activation in WEBUI
  floats,
  Property,
  floatUnitsByInstance,
  type PropertyParameters,
  unitLabels,
} from '@/stores/alice';

interface DevicePropertiesProps {
  properties: any[];
  deviceStore: any;
  onPropertyChange: (properties: any[]) => void;
}

const unitOptionsForInstance = (instance?: string): Option<string>[] => {
  const list = (instance && floatUnitsByInstance[instance]) || [];
  return list.map((u) => ({ label: unitLabels[u] ?? u, value: u }));
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

export const DeviceProperties = observer(({
  properties, deviceStore, onPropertyChange,
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
    const allOptions = unitOptionsForInstance(instance);
    if (!instance) return allOptions;

    const usedValues = new Set(
      properties
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.type === Property.Event && p.parameters?.instance === instance)
        .filter(({ i }) => i !== currentPropertyIndex) // exclude current property
        .map(({ p }) => p.parameters?.unit)
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

  const getPropertyParameters = (type: Property, currentPropertyIndex?: number) => {
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
      case Property.Event: {
        const inst = events.at(0);
        parameters.instance = inst;
        const units = unitOptionsForInstance(inst).map((o) => o.value);
        if (units.length) {
          // compute used event-values for this instance excluding current property index
          const usedValues = new Set(
            properties
              .map((p, i) => ({ p, i }))
              .filter(({ p }) => p.type === Property.Event && p.parameters?.instance === inst)
              .filter(({ i }) => i !== currentPropertyIndex)
              .map(({ p }) => p.parameters?.unit)
              .filter(Boolean) as string[]
          );

          // pick first unit that is not used yet
          const firstAvailable = units.find((u) => !usedValues.has(u));
          if (firstAvailable) {
            parameters.unit = firstAvailable;
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
                        const options = getEventValueOptions(instance, key);
                        const enabledValues = options.filter((o) => !o.isDisabled).map((o) => o.value);
                        const currentUnit = property.parameters?.unit;
                        const nextUnit = enabledValues.includes(currentUnit) ? currentUnit : (enabledValues[0] ?? null);

                        const updatedParams = {
                          ...property.parameters,
                          instance,
                          unit: nextUnit,
                        };

                        onPropertyChange(properties.map((item, i) => i === key
                          ? { ...item, parameters: updatedParams }
                          : item));
                       }}
                     />
                   </div>
                     <div>
                     <div className="aliceDeviceSkills-gridLabel aliceDeviceSkills-gridHiddenLabel">
                       {t('alice.labels.event-value')}
                     </div>
                    {getEventValueOptions(property.parameters?.instance, key).length ? (
                      <Dropdown
                        value={property.parameters?.unit}
                        options={getEventValueOptions(property.parameters?.instance, key)}
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
          const freeInstances = getAvailableFloatInstances(properties);
          return (
            <Button
              className="aliceDeviceSkills-addButton"
              label={t('alice.buttons.add-property')}
              disabled={!freeInstances.length}
              onClick={() => {
                const inst = freeInstances[0];
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
    </>
  );
});
