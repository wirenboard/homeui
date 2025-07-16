import { makeObservable, computed } from 'mobx';
import {
  JsonSchema,
  JsonObject,
  NumberStore,
  ObjectStore,
  StringStore,
  StoreBuilder
} from '@/stores/json-schema-editor';
import { WbDeviceChannelEditor } from './channel-editor-store';
import { Conditions } from './conditions';
import {
  WbDeviceParameterEditor,
  WbDeviceParameterEditorVariant,
  makeJsonSchemaForParameter
} from './parameter-editor-store';
import type {
  WbDeviceParametersGroup,
  WbDeviceTemplateChannel,
  WbDeviceTemplateParameter,
  WbDeviceTemplate,
  WbDeviceTemplateChannelSettings
} from './types';

export class WbDeviceParameterEditorsGroup {
  public properties: WbDeviceParametersGroup;
  public subgroups: WbDeviceParameterEditorsGroup[] = [];
  public parameters: WbDeviceParameterEditor[] = [];
  public channels: WbDeviceChannelEditor[] = [];

  constructor(properties: WbDeviceParametersGroup) {
    this.properties = properties;

    makeObservable(this, {
      isEnabled: computed,
      isDirty: computed,
      hasErrors: computed,
    });
  }

  get isEnabled() {
    return this.parameters.some((param) => param.isEnabled)
      || this.subgroups.some((group) => group.isEnabled)
      || this.channels.some((channel) => channel.isEnabled);
  }

  get hasErrors() {
    return this.parameters.some((param) => param.hasErrors)
      || this.subgroups.some((group) => group.hasErrors)
      || this.channels.some((channel) => channel.hasErrors);
  }

  get isDirty() {
    return this.parameters.some((param) => param.isDirty)
      || this.subgroups.some((group) => group.isDirty)
      || this.channels.some((channel) => channel.isDirty);
  }

  addSubgroup(group: WbDeviceParameterEditorsGroup) {
    this.subgroups.push(group);
  }

  addParameter(parameter: WbDeviceParameterEditor) {
    this.parameters.push(parameter);
  }

  addChannel(channel: WbDeviceChannelEditor) {
    this.channels.push(channel);
  }
}

export class DeviceSettingsObjectStore {
  public commonParams: ObjectStore;
  public groups: WbDeviceParameterEditorsGroup[] = [];
  public topLevelParameters: WbDeviceParameterEditor[] = [];

  private _parametersByName: Record<string, WbDeviceParameterEditor> = {};
  private _groupsByName: Record<string, WbDeviceParameterEditorsGroup> = {};
  private _conditions: Conditions = new Conditions();

  constructor(schema: JsonSchema, deviceTemplate: WbDeviceTemplate, initialValue: unknown) {
    this.commonParams = new ObjectStore(schema, initialValue, false, new StoreBuilder());
    this._buildGroups(deviceTemplate);
    this._buildParameters(deviceTemplate, initialValue);
    this._buildChannels(deviceTemplate, initialValue);

    makeObservable(this, {
      value: computed,
      hasErrors: computed,
      isDirty: computed,
    });
  }

  _buildGroups(deviceTemplate: WbDeviceTemplate) {
    deviceTemplate.groups?.forEach((groupProps) => {
      const group = new WbDeviceParameterEditorsGroup(groupProps);
      this._groupsByName[groupProps.id] = group;
    });

    Object.entries(this._groupsByName).forEach(([_name, group]) => {
      if (group.properties.group) {
        const parentGroup = this._groupsByName[group.properties.group];
        if (parentGroup) {
          parentGroup.addSubgroup(group);
          return;
        }
      }
      this.groups.push(group);
    });

    Object.entries(this._groupsByName).forEach(([_name, group]) => {
      group.subgroups.sort((a, b) => {
        return (a.properties.order ?? 0) - (b.properties.order ?? 0);
      });
    });

    this.groups.sort((a, b) => {
      return (a.properties.order ?? 0) - (b.properties.order ?? 0);
    });
  }

  _addParameter(parameter: WbDeviceTemplateParameter, initialValue: unknown) {
    let initialValueToSet = undefined;
    if (typeof initialValue === 'object') {
      initialValueToSet = (initialValue as Record<string, any>)[parameter.id];
    }
    const store = new NumberStore(
      makeJsonSchemaForParameter(parameter),
      initialValueToSet,
      parameter.required);
    const variant = new WbDeviceParameterEditorVariant(
      store,
      this._parametersByName,
      this._conditions.getFunction(parameter.condition, parameter.dependencies),
      parameter.dependencies
    );
    if (this._parametersByName[parameter.id]) {
      this._parametersByName[parameter.id].addVariant(variant);
      return;
    }
    const setting = new WbDeviceParameterEditor(parameter.id, variant, parameter.order ?? 0);
    this._parametersByName[parameter.id] = setting;
    if (parameter.group) {
      this._groupsByName[parameter.group]?.addParameter(setting);
    } else {
      this.topLevelParameters.push(setting);
    }
  }

  _buildParameters(deviceTemplate: WbDeviceTemplate, initialValue: unknown) {
    if (!deviceTemplate.parameters) {
      return;
    }
    deviceTemplate.parameters.forEach((parameter) => {
      this._addParameter(parameter, initialValue);
    });

    Object.values(this._groupsByName).forEach((group) => {
      group.parameters.sort((a, b) => a.order - b.order);
    });

    this.topLevelParameters.sort((a, b) => a.order - b.order);

    Object.values(this._parametersByName).forEach((param) => {
      param.variants.forEach((variant) => {
        const _t = variant.isEnabled; // Trigger computed properties
      });
    });
  }

  _buildChannels(deviceTemplate: WbDeviceTemplate, initialValue: unknown) {
    if (!deviceTemplate.channels) {
      return;
    }
    const initialChannelsByName: Record<string, WbDeviceTemplateChannel> = {};
    if (typeof initialValue === 'object') {
      const initialValueAsObject = initialValue as Record<string, unknown>;
      if (Array.isArray(initialValueAsObject.channels)) {
        initialValueAsObject.channels.forEach((channel) => {
          if (typeof channel === 'object' && channel.name) {
            initialChannelsByName[channel.name] = channel as WbDeviceTemplateChannel;
          }
        });
      }
    }
    deviceTemplate.channels.forEach((channel) => {
      const channelEditor = new WbDeviceChannelEditor(
        channel,
        initialChannelsByName[channel.name],
        this._parametersByName);
      this._groupsByName[channel.group ?? 'default']?.addChannel(channelEditor);
    });
  }

  get hasErrors() {
    return this.commonParams.hasErrors ||
      this.topLevelParameters.some((param) => param.hasErrors) ||
      this.groups.some((group) => group.hasErrors);
  }

  get isDirty() {
    return this.commonParams.isDirty ||
      this.topLevelParameters.some((param) => param.isDirty) ||
      this.groups.some((group) => group.isDirty);
  }

  get value() : JsonObject | undefined {
    let res : Record<string, any> = this.commonParams.value;
    Object.values(this._parametersByName).forEach((param) => {
      if (param.isEnabled && !param.hasErrors) {
        const value = param.value;
        if (typeof value === 'number') {
          res[param.id] = value;
        }
      }
    });
    let channels: Array<WbDeviceTemplateChannelSettings> = [];
    Object.values(this._groupsByName).forEach((group) => {
      group.channels.forEach((channel) => {
        if (channel.isEnabled && !channel.hasErrors) {
          const channelValue = channel.customProperties;
          if (channelValue !== undefined) {
            channels.push(channelValue);
          }
        }
      });
    });
    if (channels.length > 0) {
      res['channels'] = channels;
    } else {
      delete res['channels'];
    }
    return res;
  }

  setSlaveId(id: string | undefined) {
    const store = this.commonParams.getParamByKey('slave_id').store as StringStore;
    store?.setValue(id);
  }

  setDefault() {
    this.commonParams.setDefault();
    this.topLevelParameters.forEach((param) => param.setDefault());
    Object.values(this._groupsByName).forEach((group) => {
      group.parameters.forEach((param) => param.setDefault());
      group.channels.forEach((channel) => channel.setDefault());
    });
  }

  setUndefined() {
  }

  commit() {
    this.commonParams.commit();
    this.topLevelParameters.forEach((param) => param.commit());
    Object.values(this._groupsByName).forEach((group) => {
      group.parameters.forEach((param) => param.commit());
      group.channels.forEach((channel) => channel.commit());
    });
  }

  reset() {
    this.commonParams.reset();
    this.topLevelParameters.forEach((param) => param.reset());
    Object.values(this._groupsByName).forEach((group) => {
      group.parameters.forEach((param) => param.reset());
      group.channels.forEach((channel) => channel.reset());
    });
  }
}

export const loadDeviceTemplate = (schema: unknown): WbDeviceTemplate => {
  if (!schema || typeof schema !== 'object') {
    return {};
  }

  const deviceTemplate = (schema as Record<string, any>)?.device;
  if (!deviceTemplate || typeof deviceTemplate !== 'object') {
    return {};
  }

  // Convert legacy parameter definition as object to array
  const parameters = deviceTemplate.parameters;
  if (parameters && typeof parameters === 'object' && !Array.isArray(parameters)) {
    deviceTemplate.parameters = Object.entries(parameters).map(([id, param]) => {
      (param as Record<string, any>).id = id;
      return param;
    });
  }
  return deviceTemplate as WbDeviceTemplate;
};
