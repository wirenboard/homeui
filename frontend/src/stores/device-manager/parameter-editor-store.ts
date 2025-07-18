import { makeObservable, computed, observable, action } from 'mobx';
import { type JsonSchema, NumberStore } from '@/stores/json-schema-editor';
import { WbDeviceTemplateParameter } from './types';

export class WbDeviceParameterEditorVariant {
  public store: NumberStore;

  private _conditionFn?: Function;
  private _dependencies?: string[];
  private _otherParameters: Record<string, WbDeviceParameterEditor>;

  constructor(
    store: NumberStore,
    otherParameters: Record<string, WbDeviceParameterEditor>,
    conditionFn?: Function,
    dependencies?: string[]) {

    this.store = store;
    this._conditionFn = conditionFn;
    this._dependencies = dependencies;
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
      const param = this._otherParameters[dep];
      return (param !== undefined && typeof param.value === 'number') ? param.value : undefined;
    }));
    return res;
  }
}

export class WbDeviceParameterEditor {
  public id: string;
  public order: number;
  public required: boolean;
  public variants: WbDeviceParameterEditorVariant[] = [];
  /**
   * A user has enabled this parameter in the UI.
   */
  public isEnabledByUser: boolean = true;

  constructor(id: string, variant: WbDeviceParameterEditorVariant, order: number) {
    this.id = id;
    this.order = order;
    this.required = variant.store.required;
    this.variants.push(variant);

    makeObservable(this, {
      isEnabledByUser: observable,
      activeVariantIndex: computed,
      value: computed,
      isEnabledByCondition: computed,
      isDirty: computed,
      hasErrors: computed,
      hasSeveralVariants: computed,
      enableByUser: action,
      disableByUser: action,
    });
  }

  get isEnabledByCondition() {
    if (this.variants[0].store.schema.options?.hidden) {
      return false;
    }
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
    const activeVariantIndex = this.activeVariantIndex;
    return activeVariantIndex !== -1 ? this.variants[activeVariantIndex].store.isDirty : false;
  }

  get activeVariantIndex() {
    return this.variants.findIndex((variant) => variant.isEnabledByCondition);
  }

  get hasSeveralVariants() {
    return this.variants.filter((variant) => variant.isEnabledByCondition).length > 1;
  }

  addVariant(variant: WbDeviceParameterEditorVariant) {
    this.variants.push(variant);
  }

  setDefault() {
    this.variants.forEach((variant) => {
      variant.store.setDefault();
    });
  }

  setUndefined() {
    this.variants.forEach((variant) => {
      variant.store.setUndefined();
    });
  }

  enableByUser() {
    if (!this.isEnabledByUser) {
      this.setDefault();
      this.isEnabledByUser = true;
    }
  }

  disableByUser() {
    if (this.isEnabledByUser) {
      this.isEnabledByUser = false;
      this.setUndefined();
    }
  }

  commit() {
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
