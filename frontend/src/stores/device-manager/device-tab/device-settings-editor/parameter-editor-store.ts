import { makeObservable, computed, observable, action } from 'mobx';
import { compareFirmware, firmwareIsNewerOrEqual } from '@/stores/device-manager';
import { type JsonSchema, ExactNumberStore, getDefaultValue } from '@/stores/json-schema-editor';
import { type ExactNumber, exactNumberEquals, isNumberOrExact } from '@/utils/exact-number';
import { W1_ID_FORMAT } from '@/utils/one-wire-number';
import { type WbDeviceTemplateParameter, ParameterValueSource } from '../../types';
import { type Conditions } from './conditions';

export class WbDeviceParameterEditorVariant {
  public store: ExactNumberStore;
  public readonly fw: string | undefined;
  public readonly condition: string | undefined;
  public isSupportedByFirmware: boolean = true;

  private _conditionFn?: Function;
  private _dependencies?: string[];
  private _otherParameters: Map<string, WbDeviceParameterEditor>;

  constructor(
    parameter: WbDeviceTemplateParameter,
    valueFromUserDefinedConfig: number | ExactNumber | undefined,
    otherParameters: Map<string, WbDeviceParameterEditor>,
    conditions: Conditions) {

    const jsonSchema = makeJsonSchemaForParameter(parameter);
    if (parameter.type === W1_ID_FORMAT) {
      jsonSchema.format = W1_ID_FORMAT;
    }
    const initialValueToSet = valueFromUserDefinedConfig ?? getDefaultValue(jsonSchema) ?? 0;
    this.store = new ExactNumberStore(jsonSchema, initialValueToSet, parameter.required);
    this.fw = parameter.fw;
    this.condition = parameter.condition;
    this._conditionFn = conditions.getFunction(parameter.condition, parameter.dependencies);
    this._dependencies = parameter.dependencies;
    this._otherParameters = otherParameters;

    makeObservable(this, {
      isSupportedByFirmware: observable,
      isEnabledByCondition: computed,
      hasDependencyChangedByUser: computed,
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
        // ExactNumber is left out like in wb-mqtt-serial, which passes only int32 values to conditions
        return (typeof value === 'number') ? value : undefined;
      }
      return undefined;
    }));
  }

  get hasDependencyChangedByUser() {
    if (!this._conditionFn) {
      return false;
    }
    return this._dependencies?.some((dep) => {
      const param = this._otherParameters.get(dep);
      return param?.isEnabledByCondition && param.isChangedByUser;
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

  private _isUnsupportedByDevice: boolean = false;
  private _loadedFrom: ParameterValueSource = ParameterValueSource.Default;

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

    makeObservable<WbDeviceParameterEditor, '_isUnsupportedByDevice' | '_loadedFrom'>(this, {
      _isUnsupportedByDevice: observable,
      _loadedFrom: observable,
      activeVariantIndex: computed,
      isSupportedByFirmware: computed,
      supportedFirmware: computed,
      value: computed,
      isEnabledByCondition: computed,
      isChangedByUser: computed,
      valueSource: computed,
      isConfigChanged: computed,
      hasErrors: computed,
      hasBadValueFromRegisters: computed,
      hasConflictingVariants: computed,
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
    return this.valueSource !== ParameterValueSource.Device && this.variants[activeVariantIndex].store.hasErrors;
  }

  get hasBadValueFromRegisters() {
    const activeVariantIndex = this.activeVariantIndex;
    if (activeVariantIndex === -1) {
      return false;
    }
    return this.valueSource === ParameterValueSource.Device && this.variants[activeVariantIndex].store.hasErrors;
  }

  get value() {
    const activeVariantIndex = this.activeVariantIndex;
    return activeVariantIndex !== -1 ? this.variants[activeVariantIndex].store.value : undefined;
  }

  get isChangedByUser() {
    const activeVariantIndex = this.activeVariantIndex;
    return activeVariantIndex !== -1 ? this.variants[activeVariantIndex].store.isDirty : false;
  }

  get valueSource() {
    const activeVariantIndex = this.activeVariantIndex;
    if (activeVariantIndex !== -1) {
      const activeVariant = this.variants[activeVariantIndex];
      if (activeVariant.store.isDirty || activeVariant.hasDependencyChangedByUser) {
        return ParameterValueSource.User;
      }
    }
    return this._loadedFrom;
  }

  // Changes in this parameter require saving the config. Unlike shouldStoreInConfig, false for
  // a value that is already in the config and was not changed by the user or a forced reread.
  // isDirty is not used for it. A forced reread can bring an invalid value into this parameter
  // and change a parameter of its condition. With isDirty both would look like the user's input,
  // and the parameter would show an error, while a bad value from the device must be a warning.
  get isConfigChanged() {
    return this.shouldStoreInConfig && this.valueSource !== ParameterValueSource.Config;
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

  get shouldStoreInConfig() {
    if (!this.isEnabledByCondition || !this.isSupportedByFirmware) {
      return false;
    }
    return (this.required || this.valueSource !== ParameterValueSource.Default)
      && !this.hasErrors
      && !this.hasBadValueFromRegisters;
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
    this._loadedFrom = valueFromUserDefinedConfig !== undefined
      ? ParameterValueSource.Config
      : ParameterValueSource.Default;

    this.variants.push(new WbDeviceParameterEditorVariant(
      parameter,
      valueFromUserDefinedConfig,
      parametersByName,
      conditions,
    ));
  }

  setDefault() {
    this._loadedFrom = ParameterValueSource.Default;
    this.variants.forEach((variant) => {
      variant.store.setDefault();
    });
  }

  setFromDeviceRegister(value: unknown, isForce?: boolean) {
    if ((this._loadedFrom !== ParameterValueSource.Config || isForce) && isNumberOrExact(value)) {
      this.variants.forEach((variant) => {
        // The current value is the default or, on a forced reread, the config value
        if (!exactNumberEquals(value, variant.store.value)) {
          this._loadedFrom = ParameterValueSource.Device;
        }
        variant.store.setValue(value);
        variant.store.commit();
        if (this._loadedFrom === ParameterValueSource.Device && variant.store.hasErrors) {
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
      this._loadedFrom = ParameterValueSource.Default;
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
    this._loadedFrom = this.shouldStoreInConfig ? ParameterValueSource.Config : ParameterValueSource.Default;
    const value = this.variants[activeVariantIndex].store.value;
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
