import { makeObservable, computed } from 'mobx';
import {
  JsonObject,
  ObjectStore,
  StringStore,
  ArrayStore,
  StoreBuilder,
  Translator,
  loadJsonSchema
} from '@/stores/json-schema-editor';
import { WbDeviceChannelEditor } from './channel-editor-store';
import { Conditions } from './conditions';
import { WbDeviceParameterEditor } from './parameter-editor-store';
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
      isEnabledByCondition: computed,
      isDirty: computed,
      hasErrors: computed,
    });
  }

  get isEnabledByCondition() {
    return this.parameters.some((param) => param.isEnabledByCondition)
      || this.subgroups.some((group) => group.isEnabledByCondition)
      || this.channels.some((channel) => channel.isEnabledByCondition);
  }

  get hasErrors() {
    return this.parameters.some((param) => param.isEnabledByCondition && param.hasErrors)
      || this.subgroups.some((group) => group.isEnabledByCondition && group.hasErrors)
      || this.channels.some((channel) => channel.isEnabledByCondition && channel.hasErrors);
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

  setDefault() {
    this.parameters.forEach((param) => param.setDefault());
    this.channels.forEach((channel) => channel.setDefault());
    this.subgroups.forEach((group) => group.setDefault());
  }

  commit() {
    this.parameters.forEach((param) => param.commit());
    this.channels.forEach((channel) => channel.commit());
    this.subgroups.forEach((group) => group.commit());
  }

  reset() {
    this.parameters.forEach((param) => param.reset());
    this.channels.forEach((channel) => channel.reset());
    this.subgroups.forEach((group) => group.reset());
  }
}

export class DeviceSettingsObjectStore {
  public commonParams: ObjectStore;
  public customChannels?: ArrayStore;
  public topLevelGroup: WbDeviceParameterEditorsGroup;
  public schemaTranslator: Translator;

  private _parametersByName = new Map<string, WbDeviceParameterEditor>();
  private _groupsByName = new Map<string, WbDeviceParameterEditorsGroup>();
  private _conditions: Conditions = new Conditions();

  constructor(schema: unknown, userDefinedConfig: JsonObject) {
    const jsonSchema = loadJsonSchema(schema);
    const deviceTemplate = loadDeviceTemplate(schema);
    this.schemaTranslator = new Translator();
    this.schemaTranslator.addTranslations(jsonSchema.translations);
    this.schemaTranslator.addTranslations(deviceTemplate.translations);
    let customChannels: unknown[] = [];
    let templateChannels: unknown[] = [];
    if (
      typeof userDefinedConfig === 'object' &&
      userDefinedConfig !== null &&
      Array.isArray(userDefinedConfig.channels)
    ) {
      const channels = userDefinedConfig.channels as unknown[];
      channels.forEach((ch) => {
        const channelAsObject = ch as Record<string, any>;
        if (typeof channelAsObject === 'object' && channelAsObject !== null) {
          if (Object.hasOwn(channelAsObject, 'address') || Object.hasOwn(channelAsObject, 'write_address')) {
            customChannels.push(channelAsObject);
          } else {
            templateChannels.push(channelAsObject);
          }
        }
      });
    }

    delete userDefinedConfig.channels;
    userDefinedConfig.channels = customChannels;
    this.commonParams = new ObjectStore(jsonSchema, userDefinedConfig, false, new StoreBuilder());
    this.customChannels = this.commonParams.getParamByKey('channels')?.store as ArrayStore;
    this.commonParams.removeParamByKey('channels');

    this._buildGroups(deviceTemplate);
    this._buildParameters(deviceTemplate, userDefinedConfig);
    this._buildChannels(deviceTemplate, templateChannels);

    makeObservable(this, {
      value: computed,
      hasErrors: computed,
      isDirty: computed,
    });
  }

  _buildGroups(deviceTemplate: WbDeviceTemplate) {
    this.topLevelGroup = new WbDeviceParameterEditorsGroup({ id: 'topLevelGroup' });

    deviceTemplate.groups?.forEach((groupProps) => {
      const group = new WbDeviceParameterEditorsGroup(groupProps);
      this._groupsByName.set(groupProps.id, group);
    });

    this._groupsByName.forEach((group, _name) => {
      if (group.properties.group) {
        const parentGroup = this._groupsByName.get(group.properties.group);
        if (parentGroup) {
          parentGroup.addSubgroup(group);
          return;
        }
      }
      this.topLevelGroup.addSubgroup(group);
    });

    this._groupsByName.set(this.topLevelGroup.properties.id, this.topLevelGroup);

    this._groupsByName.forEach((group, _name) => {
      group.subgroups.sort((a, b) => {
        return (a.properties.order ?? 0) - (b.properties.order ?? 0);
      });
    });
  }

  _addParameter(parameter: WbDeviceTemplateParameter, userDefinedConfig: unknown) {
    let parameterEditor = this._parametersByName.get(parameter.id);
    if (parameterEditor) {
      parameterEditor.addVariant(parameter, userDefinedConfig, this._parametersByName, this._conditions);
      return;
    }
    parameterEditor = new WbDeviceParameterEditor(
      parameter, userDefinedConfig,
      this._parametersByName,
      this._conditions
    );
    this._parametersByName.set(parameter.id, parameterEditor);
    if (parameter.group && this._groupsByName.has(parameter.group)) {
      this._groupsByName.get(parameter.group)?.addParameter(parameterEditor);
    } else {
      this.topLevelGroup.addParameter(parameterEditor);
    }
  }

  _buildParameters(deviceTemplate: WbDeviceTemplate, userDefinedConfig: unknown) {
    if (!deviceTemplate.parameters) {
      return;
    }
    deviceTemplate.parameters.forEach((parameter) => {
      this._addParameter(parameter, userDefinedConfig);
    });

    this._groupsByName.forEach((group, _name) => {
      group.parameters.sort((a, b) => a.order - b.order);
    });
  }

  _buildChannels(deviceTemplate: WbDeviceTemplate, configuredChannels: unknown[]) {
    if (!deviceTemplate.channels) {
      return;
    }
    const initialChannelsByName: Record<string, WbDeviceTemplateChannel> = {};
    if (Array.isArray(configuredChannels)) {
      configuredChannels.forEach((channel) => {
        if (typeof channel === 'object' && channel !== null && Object.hasOwn(channel, 'name')) {
          initialChannelsByName[channel.name] = channel as WbDeviceTemplateChannel;
        }
      });
    }
    deviceTemplate.channels.forEach((channel) => {
      const channelEditor = new WbDeviceChannelEditor(
        channel,
        initialChannelsByName[channel.name],
        this._parametersByName);
      if (channel.group === undefined || !this._groupsByName.has(channel.group)) {
        this.topLevelGroup.addChannel(channelEditor);
      } else {
        this._groupsByName.get(channel.group)?.addChannel(channelEditor);
      }
    });
  }

  get hasErrors() {
    return this.commonParams.hasErrors || this.topLevelGroup.hasErrors || this.customChannels?.hasErrors;
  }

  get isDirty() {
    return this.commonParams.isDirty || this.topLevelGroup.isDirty || this.customChannels?.isDirty;
  }

  get value() : JsonObject | undefined {
    let res : Record<string, any> = this.commonParams.value;
    this._parametersByName.forEach((param, _name) => {
      if (param.shouldStoreInConfig) {
        const value = param.value;
        if (typeof value === 'number') {
          res[param.id] = value;
        }
      }
    });
    let tempChannels: Array<WbDeviceTemplateChannelSettings> = [];
    this._groupsByName.forEach((group, _name) => {
      group.channels.forEach((channel) => {
        if (channel.isEnabledByCondition && !channel.hasErrors) {
          const channelValue = channel.customProperties;
          if (channelValue !== undefined) {
            tempChannels.push(channelValue);
          }
        }
      });
    });

    res['channels'] = [...(this.customChannels?.value ?? []), ...tempChannels];
    if (!res['channels'].length) {
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
    this.topLevelGroup.setDefault();
  }

  setUndefined() {
  }

  commit() {
    this.commonParams.commit();
    this.topLevelGroup.commit();
    this.customChannels?.commit();
  }

  reset() {
    this.commonParams.reset();
    this.topLevelGroup.reset();
    this.customChannels?.reset();
  }

  setFromDeviceRegisters(value: unknown, fw: string){
    const valueAsObject = value as Record<string, any>;
    if (!valueAsObject) {
      return;
    }
    this._parametersByName.forEach((param, _name) => {
      param.setFirmwareInDevice(fw);
      if (Object.hasOwn(valueAsObject, param.id)) {
        param.setFromDeviceRegister(valueAsObject[param.id]);
      }
    });
    this._groupsByName.forEach((group, _name) => {
      group.channels.forEach((channel) => {
        channel.setFirmwareInDevice(fw);
      });
    });
  }
}

const loadDeviceTemplate = (schema: unknown): WbDeviceTemplate => {
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
