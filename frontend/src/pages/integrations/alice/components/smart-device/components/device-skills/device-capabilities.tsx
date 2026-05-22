import { observer } from 'mobx-react-lite';
import { Fragment, useId } from 'react';
import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import {
  Capability,
  Color,
  ColorModel,
  type CapabilityParameters,
  type SmartDeviceCapability,
  rangeUnitByInstance,
  defaultColorModelParameters,
  defaultTemperatureParameters,
  defaultColorSceneParameters,
} from '@/stores/alice';
import {
  ColorSettingCapability,
  getAvailableColorModels,
} from './capabilities/color-setting';
import { OnOffCapability } from './capabilities/on-off';
import {
  RangeCapability,
  RANGE_LIMITS_DEFAULT,
  RANGE_LIMITS_LOCKED,
  getAvailableRangeInstances,
} from './capabilities/range';
import {
  ToggleCapability,
  getAvailableToggleInstances,
} from './capabilities/toggle';
import { type CapabilitySubProps, type DeviceCapabilitiesProps } from './types';

export const DeviceCapabilities = observer(({
  capabilities, devicesStore, onCapabilityChange,
}: DeviceCapabilitiesProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();

  const isCapabilityDisabled = (
    capabilityType: Capability,
    capabilities: SmartDeviceCapability[],
  ) => {
    if (capabilityType === Capability['Color setting']) {
      // For color setting, disable only if all color models are used
      return !getAvailableColorModels(capabilities).length;
    }

    if (capabilityType === Capability.Range) {
      // For range, disable only if all range instances are used
      return !getAvailableRangeInstances(capabilities).length;
    }

    if (capabilityType === Capability.Toggle) {
      // For toggle, disable only if all toggle instances are used
      return !getAvailableToggleInstances(capabilities).length;
    }

    // For other capabilities, use existing logic
    return capabilities.find((item) => item.type === capabilityType);
  };

  const getAvailableCapabilities = () => {
    return Object.values(Capability).filter((capType) => {
      return !isCapabilityDisabled(capType, capabilities);
    });
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
      case Capability.Toggle: {
        // Select first available instance
        const availableInstances = getAvailableToggleInstances(capabilities);
        const selectedInstance = availableInstances[0] || 'backlight'; // fallback to backlight

        parameters.instance = selectedInstance;
        break;
      }
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

  const renderCapabilityFields = (capability: SmartDeviceCapability, key: number) => {
    const subProps: CapabilitySubProps = { capability, index: key, capabilities, onCapabilityChange };
    switch (capability.type) {
      case Capability['On/Off']: return <OnOffCapability />;
      case Capability['Color setting']: return <ColorSettingCapability {...subProps} />;
      // TODO: <DISABLED_MODE> - need uncomment for Mode activation in WEBUI
      // case Capability.Mode: return <ModeCapability {...subProps} />;
      case Capability.Range: return <RangeCapability {...subProps} />;
      case Capability.Toggle: return <ToggleCapability {...subProps} />;
      default: return null;
    }
  };

  const renderCapabilityRow = (capability: SmartDeviceCapability, key: number) => {
    const capabilityId = `${idPrefix}-capability-${key}`;
    const topicId = `${idPrefix}-topic-${key}`;
    return (
      <Fragment key={key}>
        <div>
          <label className="aliceDeviceSkills-gridLabel" htmlFor={capabilityId}>
            {t('alice.labels.capability')}
          </label>
          <Dropdown
            id={capabilityId}
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
          <label className="aliceDeviceSkills-gridLabel" htmlFor={topicId}>
            {t('alice.labels.topic')}
          </label>
          <Dropdown
            id={topicId}
            className="aliceDeviceSkills-dropdown"
            value={capability.mqtt}
            placeholder={devicesStore.topics.flatMap((g) => g.options)
              .find((o) => o.value === capability.mqtt)?.label}
            options={devicesStore.topics as any[]}
            isSearchable
            onChange={({ value }: Option<string>) => {
              onCapabilityChange(capabilities.map((item, i) => (
                i === key ? { ...item, mqtt: value } : item
              )));
            }}
          />
        </div>

        {renderCapabilityFields(capability, key)}

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
    );
  };

  return (
    <>
      <h6>{t('alice.labels.device-capabilities')}</h6>
      <div className="aliceDeviceSkills">
        <p>{t('alice.labels.device-capabilities-description')}</p>
        <div className="aliceDeviceSkills-grid">
          {capabilities.map(renderCapabilityRow)}
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
