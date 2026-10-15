import { action, computed, makeObservable, observable } from 'mobx';
import type { Option } from '@/components/dropdown';
import { ExactNumber, exactNumberEquals, isNumberOrExact } from '@/utils/exact-number';
import { reverseTransformNumber, transformNumber, W1_ID_FORMAT } from '@/utils/one-wire-number';
import { MistypedValue } from './mistyped-value';
import { getDefaultNumberValue } from './schema-helpers';
import type { ExactNumberStoreValue, JsonSchema, ValidationError } from './types';

const W1_ID_PATTERN = /^(28-[0-9A-Fa-f]{12}|0)$/;

// Number parameter of a wb-mqtt-serial device, keeps integers above 2^53 exactly.
// A special store for the device parameter editor, it does not implement PropertyStore
export class ExactNumberStore {
  public value: ExactNumberStoreValue;
  public schema: JsonSchema;
  public isDirty: boolean = false;
  public error: ValidationError | undefined;
  public enumOptions: Option<number>[] = [];
  public editString: string;

  readonly required: boolean;

  private _initialValue: ExactNumberStoreValue;
  private _anyUserInputIsDirty: boolean = false;
  private _doNotShowInvalidValue: boolean = false;

  constructor(schema: JsonSchema, initialValue: unknown, required: boolean) {
    this.schema = schema;
    this.required = required;
    if (initialValue === undefined) {
      this._initialValue = required ? getDefaultNumberValue(schema) ?? 0 : undefined;
    } else {
      this._initialValue = isNumberOrExact(initialValue) ? initialValue : new MistypedValue(initialValue);
    }
    this.enumOptions = schema.enum?.map((value, index) => ({
      label: schema.options?.enum_titles?.[index] ?? String(value),
      value: value as number,
    })) ?? [];
    this.reset();

    makeObservable(this, {
      value: observable.ref,
      error: observable.ref,
      editString: observable,
      isDirty: observable,
      hasErrors: computed,
      setValue: action,
      setUndefined: action,
      setEditString: action,
      setDefault: action,
      commit: action,
      reset: action,
      setDoNotShowInvalidValue: action,
    });
  }

  get hasErrors(): boolean {
    return !!this.error;
  }

  setValue(value: unknown) {
    if (typeof value === 'string') {
      // The enum dropdown passes the option value as a string
      const parsedValue = ExactNumber.parse(value);
      this.value = Number.isNaN(parsedValue) ? new MistypedValue(value) : parsedValue;
    } else {
      this.value = isNumberOrExact(value) ? value : new MistypedValue(value);
    }
    this._showValue();
    this.isDirty = !exactNumberEquals(this.value, this._initialValue);
  }

  setEditString(value: string) {
    this.editString = value;
    if (!value && this.schema.format === W1_ID_FORMAT) {
      this.value = 0;
      this.editString = '0';
    } else if (value === '') {
      this.value = undefined;
    } else if (!isNaN(Number(value))) {
      this.value = ExactNumber.parse(value);
    } else {
      this.value = this.schema.format === W1_ID_FORMAT ? reverseTransformNumber(value) : new MistypedValue(value);
    }
    this.isDirty = this._anyUserInputIsDirty || !exactNumberEquals(this.value, this._initialValue);
    this._checkConstraints();
  }

  setUndefined() {
    this.value = undefined;
    this.editString = '';
    this.isDirty = this._initialValue !== undefined;
    this._checkConstraints();
  }

  setDefault() {
    this.setValue(getDefaultNumberValue(this.schema) ?? 0);
  }

  commit() {
    this._initialValue = this.value;
    this.isDirty = false;
  }

  reset() {
    this.value = this._initialValue;
    this._showValue();
    this.isDirty = false;
  }

  // If true, an invalid value set by setValue is not shown in the editor
  setDoNotShowInvalidValue(doNotShow: boolean) {
    this._doNotShowInvalidValue = doNotShow;
    if (doNotShow && this.hasErrors) {
      this.editString = '';
    }
  }

  // If true, any user input marks the store dirty, even if the value equals the initial one
  setAnyUserInputIsDirty(anyUserInputIsDirty: boolean) {
    this._anyUserInputIsDirty = anyUserInputIsDirty;
  }

  private _showValue() {
    if (!isNumberOrExact(this.value)) {
      this.editString = '';
    } else {
      this.editString = this.schema.format === W1_ID_FORMAT ? transformNumber(this.value) : String(this.value);
    }
    this._checkConstraints();
    this.setDoNotShowInvalidValue(this._doNotShowInvalidValue);
  }

  private _checkConstraints() {
    // Checked first, so a mistyped 1-Wire ID gets the format error
    if (this.schema.format === W1_ID_FORMAT && this.editString && !W1_ID_PATTERN.test(this.editString)) {
      this.error = { key: 'json-editor.errors.invalid-1-wire-format' };
    } else if (this.value instanceof MistypedValue) {
      this.error = { key: 'json-editor.errors.not-a-number' };
    } else if (this.value === undefined) {
      const forbidUndefined = this.required || this.schema.options?.show_opt_in;
      this.error = forbidUndefined ? { key: 'json-editor.errors.required' } : undefined;
    } else if (this.schema.enum && !this.schema.enum.some((item) => exactNumberEquals(this.value, item))) {
      this.error = { key: 'json-editor.errors.not-in-enum' };
    } else if (
      (this.schema.minimum !== undefined && Number(this.value) < this.schema.minimum) ||
      (this.schema.maximum !== undefined && Number(this.value) > this.schema.maximum)
    ) {
      let context = this.schema.minimum !== undefined ? 'min' : '';
      context += this.schema.maximum !== undefined ? 'max' : '';
      this.error = {
        key: 'json-editor.errors.' + context,
        data: { context: context, min: this.schema.minimum, max: this.schema.maximum },
      };
    } else {
      this.error = undefined;
    }
  }
}
