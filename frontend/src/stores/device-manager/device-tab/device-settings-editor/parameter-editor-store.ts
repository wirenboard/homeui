import { makeObservable, computed, observable, action } from 'mobx';
import { type JsonSchema, NumberStore, getDefaultValue } from '@/stores/json-schema-editor';
import { firmwareIsNewer } from '~/utils/fwUtils';
import type { WbDeviceTemplateParameter } from '../../types';
import { type Conditions } from './conditions';

export class WbDeviceParameterEditorVariant {
  public store: NumberStore;

  private _conditionFn?: Function;
  private _dependencies?: string[];
  private _otherParameters: Map<string, WbDeviceParameterEditor>;

  constructor(
    parameter: WbDeviceTemplateParameter,
    valueFromUserDefinedConfig: number | undefined,
    otherParameters: Map<string, WbDeviceParameterEditor>,
    conditions: Conditions) {

    const jsonSchema = makeJsonSchemaForParameter(parameter);
    const initialValueToSet = valueFromUserDefinedConfig ?? getDefaultValue(jsonSchema);
    this.store = new NumberStore(jsonSchema, initialValueToSet, parameter.required);
    this._conditionFn = conditions.getFunction(parameter.condition, parameter.dependencies);
    this._dependencies = parameter.dependencies;
    this._otherParameters = otherParameters;

    makeObservable(this, {
      isEnabledByCondition: computed,
    });
  }

  get isEnabledByCondition() {
    if (!this._conditionFn) {
      return true;
    }
    const res = this._conditionFn.apply(null, this._dependencies?.map((dep) => {
      const param = this._otherParameters.get(dep);
      if (param !== undefined && param.isEnabledByCondition) {
        const value = param.value;
        return (typeof value === 'number') ? value : undefined;
      }
      return undefined;
    }));
    return res;
  }
}

export class WbDeviceParameterEditor {
  public id: string;
  public order: number;
  public required: boolean;
  public variants: WbDeviceParameterEditorVariant[] = [];
  public isSetInDeviceRegisters: boolean = false;
  public isSetInUserDefinedConfig: boolean = false;
  public isSupportedByFirmware: boolean = true;
  public supportedFirmware: string | undefined;

  constructor(
    parameter: WbDeviceTemplateParameter,
    userDefinedConfig: unknown,
    parametersByName: Map<string, WbDeviceParameterEditor>,
    conditions: Conditions
  ) {
    this.addVariant(parameter, userDefinedConfig, parametersByName, conditions);
    this.id = parameter.id;
    this.order = parameter.order ?? 0;
    this.required = this.variants[0].store.required;
    this.supportedFirmware = parameter.fw;

    makeObservable(this, {
      isSupportedByFirmware: observable,
      isSetInDeviceRegisters: observable,
      isChangedByUser: computed,
      activeVariantIndex: computed,
      value: computed,
      isEnabledByCondition: computed,
      isDirty: computed,
      hasErrors: computed,
      hasSeveralVariants: computed,
      shouldStoreInConfig: computed,
      addVariant: action,
      setFromDeviceRegister: action,
      setFirmwareInDevice: action,
      commit: action,
    });
  }

  get isEnabledByCondition() {
    return this.variants.some((variant) => variant.isEnabledByCondition);
  }

  get hasErrors() {
    const activeVariantIndex = this.activeVariantIndex;
    return activeVariantIndex !== -1 ? this.variants[activeVariantIndex].store.hasErrors : false;
  }

  get value() {
    const activeVariantIndex = this.activeVariantIndex;
    return activeVariantIndex !== -1 ? this.variants[activeVariantIndex].store.value : undefined;
  }

  get isDirty() {
    if (this.isSetInDeviceRegisters) {
      return true;
    }
    const activeVariantIndex = this.activeVariantIndex;
    return activeVariantIndex !== -1 ? this.variants[activeVariantIndex].store.isDirty : false;
  }

  get activeVariantIndex() {
    return this.variants.findIndex((variant) => variant.isEnabledByCondition);
  }

  get hasSeveralVariants() {
    return this.variants.filter((variant) => variant.isEnabledByCondition).length > 1;
  }

  get isChangedByUser() {
    return this.isSetInUserDefinedConfig || this.isSetInDeviceRegisters || this.isDirty;
  }

  get shouldStoreInConfig() {
    return this.isSupportedByFirmware &&
      this.isEnabledByCondition &&
      (this.required || this.isChangedByUser) &&
      !this.hasErrors;
  }

  addVariant(
    parameter: WbDeviceTemplateParameter,
    userDefinedConfig: unknown,
    parametersByName: Map<string, WbDeviceParameterEditor>,
    conditions: Conditions
  ) {

    let valueFromUserDefinedConfig = undefined;
    if (typeof userDefinedConfig === 'object') {
      valueFromUserDefinedConfig = (userDefinedConfig as Record<string, any>)[parameter.id];
    }
    this.isSetInUserDefinedConfig = valueFromUserDefinedConfig !== undefined;

    this.variants.push(new WbDeviceParameterEditorVariant(
      parameter,
      valueFromUserDefinedConfig,
      parametersByName,
      conditions
    ));
  }

  setDefault() {
    this.variants.forEach((variant) => {
      variant.store.setDefault();
    });
  }

  setFromDeviceRegister(value: unknown) {
    if (!this.isSetInUserDefinedConfig && this.isSupportedByFirmware && typeof value === 'number') {
      this.variants.forEach((variant) => {
        if (value !== 0xFFFE || variant.store.isAcceptableValue(value)) {
          variant.store.setValue(value);
          variant.store.commit();
          if (!this.isSetInDeviceRegisters && value !== getDefaultValue(variant.store.schema, true)) {
            this.isSetInDeviceRegisters = true;
          }
        }
      });
    }
  }

  setFirmwareInDevice(fw: string) {
    this.isSupportedByFirmware = firmwareIsNewer(this.supportedFirmware, fw);
  }

  commit() {
    if (this.isDirty) {
      this.isSetInUserDefinedConfig = true;
      this.isSetInDeviceRegisters = false;
    }
    this.variants.forEach((variant) => {
      variant.store.commit();
    });
  }

  reset() {
    this.variants.forEach((variant) => {
      variant.store.reset();
    });
  }
}

export function makeJsonSchemaForParameter(parameter: WbDeviceTemplateParameter): JsonSchema {
  return {
    type: 'number',
    title: parameter.title,
    description: parameter.description,
    default: parameter.default,
    enum: parameter.enum,
    minimum: parameter.min,
    maximum: parameter.max,
    propertyOrder: parameter.order,
    options: {
      enum_titles: parameter.enum_titles,
      show_opt_in: !parameter.required,
    },
  };
}
