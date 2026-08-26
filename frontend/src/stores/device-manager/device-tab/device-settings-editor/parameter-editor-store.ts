import { makeObservable, computed, observable, action, runInAction } from 'mobx';
import { compareFirmware, firmwareIsNewerOrEqual } from '@/stores/device-manager';
import { type JsonSchema, NumberStore, getDefaultValue } from '@/stores/json-schema-editor';
import { W1_ID_FORMAT } from '@/utils/one-wire-number';
import type { WbDeviceTemplateParameter } from '../../types';
import { type Conditions } from './conditions';

export class WbDeviceParameterEditorVariant {
  public store: NumberStore;
  public readonly fw: string | undefined;
  public readonly condition: string | undefined;
  public isSupportedByFirmware: boolean = true;

  private _conditionFn?: Function;
  private _dependencies?: string[];
  private _otherParameters: Map<string, WbDeviceParameterEditor>;

  constructor(
    parameter: WbDeviceTemplateParameter,
    valueFromUserDefinedConfig: number | undefined,
    otherParameters: Map<string, WbDeviceParameterEditor>,
    conditions: Conditions) {

    const jsonSchema = makeJsonSchemaForParameter(parameter);
    if (parameter.type === W1_ID_FORMAT) {
      jsonSchema.format = W1_ID_FORMAT;
    }
    const initialValueToSet = valueFromUserDefinedConfig ?? getDefaultValue(jsonSchema) ?? 0;
    this.store = new NumberStore(jsonSchema, initialValueToSet, parameter.required);
    this.fw = parameter.fw;
    this.condition = parameter.condition;
    this._conditionFn = conditions.getFunction(parameter.condition, parameter.dependencies);
    this._dependencies = parameter.dependencies;
    this._otherParameters = otherParameters;

    makeObservable(this, {
      isSupportedByFirmware: observable,
      isEnabledByCondition: computed,
      hasDirtyDependency: computed,
      setFirmwareInDevice: action,
    });
  }

  setFirmwareInDevice(fw: string) {
    this.isSupportedByFirmware = firmwareIsNewerOrEqual(this.fw, fw);
  }

  get isEnabledByCondition() {
    if (!this._conditionFn) {
      return true;
    }
    return this._conditionFn.apply(null, this._dependencies?.map((dep) => {
      const param = this._otherParameters.get(dep);
      if (param !== undefined && param.isEnabledByCondition) {
        const value = param.value;
        return (typeof value === 'number') ? value : undefined;
      }
      return undefined;
    }));
  }

  get hasDirtyDependency() {
    if (!this._conditionFn) {
      return false;
    }
    return this._dependencies?.some((dep) => {
      const param = this._otherParameters.get(dep);
      return param?.isEnabledByCondition && param.isDirty;
    }) ?? false;
  }
}

// Template declarations with the same id are variants of one parameter: condition variants are
// mutually exclusive, fw variants share a condition and differ in fw and enum (the newer adds values)
export class WbDeviceParameterEditor {
  public id: string;
  public order: number;
  public required: boolean;
  public variants: WbDeviceParameterEditorVariant[] = [];
  public isSetInDeviceRegisters: boolean = false;
  public isSetInUserDefinedConfig: boolean = false;

  private _isUnsupportedByDevice: boolean = false;

  constructor(
    parameter: WbDeviceTemplateParameter,
    userDefinedConfig: unknown,
    parametersByName: Map<string, WbDeviceParameterEditor>,
    conditions: Conditions,
  ) {
    this.addVariant(parameter, userDefinedConfig, parametersByName, conditions);
    this.id = parameter.id;
    this.order = parameter.order ?? 0;
    this.required = this.variants[0].store.required;

    makeObservable<WbDeviceParameterEditor, '_isUnsupportedByDevice'>(this, {
      _isUnsupportedByDevice: observable,
      isSetInDeviceRegisters: observable,
      activeVariantIndex: computed,
      isSupportedByFirmware: computed,
      supportedFirmware: computed,
      value: computed,
      isEnabledByCondition: computed,
      isDirty: computed,
      hasErrors: computed,
      hasBadValueFromRegisters: computed,
      hasConflictingVariants: computed,
      hasDirtyDependency: computed,
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

  get isSupportedByFirmware() {
    return !this._isUnsupportedByDevice
      && this.variants.some((variant) => variant.isEnabledByCondition && variant.isSupportedByFirmware);
  }

  get supportedFirmware() {
    return this._getEnabledVariantsOldestFirst()[0]?.fw;
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

  // The newest variant supported by the device firmware, otherwise the oldest one to show it disabled.
  // indexOf(undefined) gives -1 when no variant is enabled
  get activeVariantIndex() {
    const enabled = this._getEnabledVariantsOldestFirst();
    const supported = enabled.filter((variant) => variant.isSupportedByFirmware);
    return this.variants.indexOf(supported.at(-1) ?? enabled[0]);
  }

  // Shown under the editor as a template error: several declarations match at once, the daemon
  // rejects such a config as a duplicate parameter. A chain of fw variants shares one condition
  get hasConflictingVariants() {
    return new Set(
      this.variants.filter((variant) => variant.isEnabledByCondition).map((variant) => variant.condition),
    ).size > 1;
  }

  get hasDirtyDependency() {
    return this.variants.some((variant) => variant.hasDirtyDependency);
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
    return (this.required || this.isDirty || this.hasDirtyDependency) && !this.hasErrors;
  }

  addVariant(
    parameter: WbDeviceTemplateParameter,
    userDefinedConfig: unknown,
    parametersByName: Map<string, WbDeviceParameterEditor>,
    conditions: Conditions,
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
      conditions,
    ));
  }

  setDefault() {
    this.isSetInUserDefinedConfig = false;
    this.isSetInDeviceRegisters = false;
    this.variants.forEach((variant) => {
      variant.store.setDefault();
    });
  }

  setFromDeviceRegister(value: unknown, isForce?: boolean) {
    if ((!this.isSetInUserDefinedConfig || isForce) && typeof value === 'number') {
      this.variants.forEach((variant) => {
        variant.store.setValue(value);
        variant.store.commit();
        if (!this.isSetInDeviceRegisters && value !== getDefaultValue(variant.store.schema)) {
          runInAction(() => {
            this.isSetInDeviceRegisters = true;
            if (isForce) {
              variant.store.isDirty = true;
            }
          });
        }
        if (this.isSetInDeviceRegisters && variant.store.hasErrors) {
          variant.store.setAnyUserInputIsDirty(true);
          variant.store.setDoNotShowInvalidValue(true);
        }
      });
    } else if (value === 'unsupported') {
      this._isUnsupportedByDevice = true;
    }
  }

  setFirmwareInDevice(fw: string) {
    this.variants.forEach((variant) => variant.setFirmwareInDevice(fw));
    this._isUnsupportedByDevice = false;
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
    if (this.shouldStoreInConfig) {
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

  private _getEnabledVariantsOldestFirst() {
    return this.variants
      .filter((variant) => variant.isEnabledByCondition)
      .sort((a, b) => compareFirmware(a.fw, b.fw));
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
