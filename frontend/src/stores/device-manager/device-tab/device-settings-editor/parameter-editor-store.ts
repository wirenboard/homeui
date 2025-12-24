import { makeObservable, computed, observable, action, runInAction } from 'mobx';
import { type JsonSchema, NumberStore, getDefaultValue } from '@/stores/json-schema-editor';
import { firmwareIsNewerOrEqual } from '~/utils/fwUtils';
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
    const initialValueToSet = valueFromUserDefinedConfig ?? getDefaultValue(jsonSchema) ?? 0;
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
      activeVariantIndex: computed,
      value: computed,
      isEnabledByCondition: computed,
      isDirty: computed,
      hasErrors: computed,
      hasBadValueFromRegisters: computed,
      hasSeveralVariants: computed,
      shouldStoreInConfig: computed,
      addVariant: action,
      setFromDeviceRegister: action,
      setFirmwareInDevice: action,
      commit: action,
      setDefault: action,
    });
  }

  get isEnabledByCondition() {
    return this.variants.some((variant) => variant.isEnabledByCondition);
  }

  get hasErrors() {
    const activeVariantIndex = this.activeVariantIndex;
    if (activeVariantIndex === -1) {
      return false;
    }
    const activeVariantStore = this.variants[activeVariantIndex].store;
    if (this.isSetInDeviceRegisters) {
      return activeVariantStore.isDirty && activeVariantStore.hasErrors;
    }
    return activeVariantStore.hasErrors;
  }

  get hasBadValueFromRegisters() {
    if (!this.isSetInDeviceRegisters) {
      return false;
    }
    const activeVariantIndex = this.activeVariantIndex;
    if (activeVariantIndex === -1) {
      return false;
    }
    const activeVariantStore = this.variants[activeVariantIndex].store;
    return !activeVariantStore.isDirty && activeVariantStore.hasErrors;
  }

  get value() {
    const activeVariantIndex = this.activeVariantIndex;
    return activeVariantIndex !== -1 ? this.variants[activeVariantIndex].store.value : undefined;
  }

  get isDirty() {
    const activeVariantIndex = this.activeVariantIndex;
    return activeVariantIndex !== -1 ? this.variants[activeVariantIndex].store.isDirty : false;
  }

  get activeVariantIndex() {
    return this.variants.findIndex((variant) => variant.isEnabledByCondition);
  }

  get hasSeveralVariants() {
    return this.variants.filter((variant) => variant.isEnabledByCondition).length > 1;
  }

  get shouldStoreInConfig() {
    if (!this.isEnabledByCondition || !this.isSupportedByFirmware) {
      return false;
    }
    if (this.isSetInUserDefinedConfig) {
      return !this.hasErrors;
    }
    if (this.isSetInDeviceRegisters) {
      return !this.hasBadValueFromRegisters;
    }
    return (this.required || this.isDirty) && !this.hasErrors;
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
    this.isSetInUserDefinedConfig = false;
    this.isSetInDeviceRegisters = false;
    this.variants.forEach((variant) => {
      variant.store.setDefault();
    });
  }

  setFromDeviceRegister(value: unknown) {
    if (!this.isSetInUserDefinedConfig && this.isSupportedByFirmware && typeof value === 'number') {
      this.variants.forEach((variant) => {
        variant.store.setValue(value);
        variant.store.commit();
        if (!this.isSetInDeviceRegisters && value !== getDefaultValue(variant.store.schema)) {
          runInAction(() => {
            this.isSetInDeviceRegisters = true;
          });
        }
        if (this.isSetInDeviceRegisters && variant.store.hasErrors) {
          variant.store.setAnyUserInputIsDirty(true);
          variant.store.setDoNotShowInvalidValue(true);
        }
      });
    }
  }

  setFirmwareInDevice(fw: string) {
    this.isSupportedByFirmware = firmwareIsNewerOrEqual(this.supportedFirmware, fw);
  }

  /**
   * Must be called after saving a config.
   * Marks the parameter as set in user-defined config if it was changed by the user or in device registers
   * Nothing changes if there are validation errors.
   */
  commit() {
    const activeVariantIndex = this.activeVariantIndex;
    if (activeVariantIndex === -1) {
      this.isSetInUserDefinedConfig = false;
      this.isSetInDeviceRegisters = false;
      this.variants.forEach((variant) => {
        variant.store.setAnyUserInputIsDirty(false);
        variant.store.setDoNotShowInvalidValue(false);
        variant.store.setDefault();
        variant.store.commit();
      });
      return;
    }
    if (this.hasErrors || this.hasBadValueFromRegisters) {
      return;
    }
    if (this.isDirty || this.isSetInDeviceRegisters) {
      this.isSetInUserDefinedConfig = true;
    }
    this.isSetInDeviceRegisters = false;
    const value = this.variants[activeVariantIndex].store.value as number;
    this.variants.forEach((variant) => {
      variant.store.setAnyUserInputIsDirty(false);
      variant.store.setDoNotShowInvalidValue(false);
      variant.store.setValue(value);
      variant.store.commit();
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
