import { makeObservable, computed } from 'mobx';
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
      isEnabled: computed,
    });
  }

  get isEnabled() {
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
  public order: number = 0;
  public variants: WbDeviceParameterEditorVariant[] = [];

  constructor(id: string, variant: WbDeviceParameterEditorVariant, order: number) {
    this.id = id;
    this.order = order;
    this.variants.push(variant);

    makeObservable(this, {
      activeVariantIndex: computed,
      value: computed,
      isEnabled: computed,
      isDirty: computed,
      hasErrors: computed,
      hasSeveralVariants: computed,
    });
  }

  get isEnabled() {
    if (this.variants[0].store.schema.options?.hidden) {
      return false;
    }
    return this.variants.some((variant) => variant.isEnabled);
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
    return this.variants.findIndex((variant) => variant.isEnabled);
  }

  get hasSeveralVariants() {
    return this.variants.filter((variant) => variant.isEnabled).length > 1;
  }

  addVariant(variant: WbDeviceParameterEditorVariant) {
    this.variants.push(variant);
  }

  setDefault() {
    this.variants.forEach((variant) => {
      variant.store.setDefault();
    });
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
      grid_columns: 6,
      enum_titles: parameter.enum_titles,
      wb: {
        show_editor: true,
      },
    },
  };
}
