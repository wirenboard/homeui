import { action, makeObservable, observable, computed } from 'mobx';
import type { Option } from '@/components/dropdown';
import {
  DALI_TC_FORMAT,
  DALI_TC_MASK_VALUE,
  formatKelvinEditString,
  kelvinToMirek,
  validateKelvinEditString,
} from '@/utils/dali-color-temperature';
import { reverseTransformNumber, transformNumber, W1_ID_FORMAT } from '@/utils/one-wire-number';
import { MistypedValue } from './mistyped-value';
import { getDefaultNumberValue } from './schema-helpers';
import type { JsonSchema, ValidationError, PropertyStore } from './types';

const formatEditString = (schema: JsonSchema, value: number): string => {
  if (schema.format === W1_ID_FORMAT) {
    return transformNumber(value);
  }
  if (schema.format === DALI_TC_FORMAT) {
    return formatKelvinEditString(value);
  }
  return String(value);
};

export class NumberStore implements PropertyStore {
  public value: MistypedValue | number | undefined;
  public schema: JsonSchema;
  public isDirty: boolean = false;
  public error: ValidationError | undefined;
  public enumOptions: Option<number>[] = [];
  public editString: string;

  readonly storeType = 'number';
  readonly required: boolean;

  private _initialValue: MistypedValue | number | undefined;
  private _anyUserInputIsDirty: boolean = false;
  private _doNotShowInvalidValue: boolean = false;

  constructor(schema: JsonSchema, initialValue: unknown, required: boolean) {
    if (typeof initialValue === 'number') {
      this.value = initialValue;
      this.editString = formatEditString(schema, initialValue);
    } else if (initialValue === undefined) {
      this.value = undefined;
      if (required || (schema.options?.wb?.show_editor && !schema.options?.wb?.allow_undefined)) {
        this.value = getDefaultNumberValue(schema) ?? 0;
      }
      this.editString = typeof this.value === 'number' ? formatEditString(schema, this.value) : '';
    } else {
      this.value = new MistypedValue(initialValue);
      this.editString = '';
    }
    this._initialValue = this.value;
    this.schema = schema;
    this.required = required;

    this.enumOptions = this.schema.enum?.map((value, index) => ({
      label: this.schema.options?.enum_titles?.[index] ?? String(value),
      value: value as number,
    })) ?? [];

    this._checkConstraints();

    makeObservable(this, {
      value: observable.ref,
      error: observable.ref,
      editString: observable,
      setValue: action,
      setUndefined: action,
      setEditString: action,
      _checkConstraints: action,
      hasErrors: computed,
      isDirty: observable,
      commit: action,
      reset: action,
      setDoNotShowInvalidValue: action,
    });
  }

  _checkConstraints() {
    if (this.value instanceof MistypedValue) {
      this.error = { key: 'json-editor.errors.not-a-number' };
      return;
    }
    if (this.value === undefined) {
      const forbidUndefined = (this.schema.options?.wb?.show_editor && !this.schema.options?.wb?.allow_undefined)
        || this.required
        || this.schema.options?.show_opt_in;
      this.error = forbidUndefined ? { key: 'json-editor.errors.required' } : undefined;
      return;
    }
    if (this.schema.enum && !this.schema.enum.includes(this.value)) {
      this.error = { key: 'json-editor.errors.not-in-enum' };
      return;
    }
    if (this.schema.type === 'integer' && !Number.isSafeInteger(this.value)) {
      this.error = { key: 'json-editor.errors.not-an-integer' };
      return;
    }
    if (this.schema.format === DALI_TC_FORMAT) {
      this.error = this.value === DALI_TC_MASK_VALUE
        ? undefined
        : validateKelvinEditString(
          this.editString,
          this.schema.options?.wb?.dali_tc?.minimum ?? 1,
          this.schema.options?.wb?.dali_tc?.maximum ?? (DALI_TC_MASK_VALUE - 1),
        );
      return;
    }
    if (
      (this.schema.minimum !== undefined && this.schema.minimum > this.value) ||
      (this.schema.maximum !== undefined && this.schema.maximum < this.value)
    ) {
      let context = this.schema.minimum !== undefined ? 'min' : '';
      context += this.schema.maximum !== undefined ? 'max' : '';
      this.error = {
        key: 'json-editor.errors.' + context,
        data: {
          context: context,
          min: this.schema.minimum,
          max: this.schema.maximum,
        },
      };
      return;
    }
    if (this.schema.format === W1_ID_FORMAT && this.editString) {
      const hexPattern = /^(28-[0-9A-Fa-f]{12}|0)$/;
      if (!hexPattern.test(this.editString)) {
        this.error = { key: 'json-editor.errors.invalid-1-wire-format' };
        return;
      }
    }
    this.error = undefined;
  }

  setValue(value: unknown) {
    if (typeof value === 'string') {
      const parsedValue = Number(value);
      if (isNaN(parsedValue)) {
        this.value = new MistypedValue(value);
        this.editString = '';
      } else {
        this.value = parsedValue;
        this.editString = this.schema.format === DALI_TC_FORMAT
          ? formatEditString(this.schema, parsedValue)
          : value;
      }
    } else if (typeof value === 'number') {
      this.value = value;
      this.editString = formatEditString(this.schema, value);
    } else {
      this.value = new MistypedValue(value);
      this.editString = '';
    }
    this.isDirty = this.value !== this._initialValue;
    this._checkConstraints();
    if (this._doNotShowInvalidValue && this.hasErrors) {
      this.editString = '';
    }
  }

  setEditString(value: string) {
    this.editString = value;
    if (!value && this.schema.format === W1_ID_FORMAT) {
      this.value = 0;
      this.editString = '0';
    } else if (value === '') {
      this.value = undefined;
    } else {
      const parsedValue = Number(value);
      if (isNaN(parsedValue)) {
        this.value = this.schema.format === W1_ID_FORMAT ? reverseTransformNumber(value) : new MistypedValue(value);
      } else {
        this.value = this.schema.format === DALI_TC_FORMAT ? kelvinToMirek(parsedValue) : parsedValue;
      }
    }
    if (this._anyUserInputIsDirty) {
      this.isDirty = true;
    } else {
      this.isDirty = this.value !== this._initialValue;
    }
    this._checkConstraints();
  }

  setUndefined() {
    this.value = undefined;
    this.editString = '';
    this.isDirty = this.value !== this._initialValue;
    this._checkConstraints();
  }

  setDefault() {
    if (!this.required && this.schema.options?.wb?.show_editor && this.schema.options?.wb?.allow_undefined) {
      this.setUndefined();
      return;
    }
    this.setValue(getDefaultNumberValue(this.schema) ?? 0);
  }

  get hasErrors(): boolean {
    return !!this.error;
  }

  get defaultText(): string {
    return this.schema.default !== undefined ? String(this.schema.default) : '';
  }

  commit(): void {
    this._initialValue = this.value;
    this.isDirty = false;
  }

  reset(): void {
    this.value = this._initialValue;
    this.isDirty = false;
    this._checkConstraints();
    if (this._doNotShowInvalidValue && this.hasErrors) {
      this.editString = '';
    }
  }

  /**
   * If true, invalid value, that was set with setValue method,
   * will not be shown in the editor
   */
  setDoNotShowInvalidValue(doNotShow: boolean) {
    this._doNotShowInvalidValue = doNotShow;
    if (doNotShow && this.hasErrors) {
      this.editString = '';
    }
  }

  /**
   * If true, any user input will mark the property as dirty,
   * even if the value is equal to the initial value
   */
  setAnyUserInputIsDirty(anyUserInputIsDirty: boolean) {
    this._anyUserInputIsDirty = anyUserInputIsDirty;
  }
}
