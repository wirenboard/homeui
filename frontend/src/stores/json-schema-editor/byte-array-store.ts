import { action, makeObservable, observable, computed } from 'mobx';
import { MistypedValue } from './mistyped-value';
import type { JsonSchema, ValidationError, PropertyStore } from './types';

export class ByteArrayStore implements PropertyStore {
  public value: MistypedValue | string[] | undefined;
  public schema: JsonSchema;
  public isDirty: boolean = false;
  public error: ValidationError | undefined;
  public editString: string;

  readonly storeType = 'byte-array';
  readonly required: boolean;
  readonly defaultText = '';

  private _initialValue: MistypedValue | string[] | undefined;

  constructor(schema: JsonSchema, initialValue: unknown, required: boolean) {
    if (Array.isArray(initialValue)) {
      this.value = initialValue.map((item) => String(item));
      this.editString = this.value.join(', ');
    } else {
      if (initialValue === undefined) {
        this.value = schema.options?.wb?.show_editor && !schema.options?.wb?.allow_undefined ? [] : undefined;
      } else {
        this.value = new MistypedValue(initialValue);
      }
      this.editString = '';
    }
    this._initialValue = this.value;
    this.schema = schema;
    this.required = required;

    this._checkConstraints();

    makeObservable(this, {
      value: observable.ref,
      error: observable.ref,
      editString: observable,
      setUndefined: action,
      setEditString: action,
      _checkConstraints: action,
      hasErrors: computed,
      isDirty: observable,
      commit: action,
      reset: action,
    });
  }

  _checkConstraints(): void {
    if (this.value instanceof MistypedValue) {
      this.error = { key: 'json-editor.errors.not-a-byte-array' };
      return;
    }
    if (this.value === undefined) {
      const forbidUndefined = (this.schema.options?.wb?.show_editor && !this.schema.options?.wb?.allow_undefined)
        || this.required
        || this.schema.options?.show_opt_in;
      this.error = forbidUndefined ? { key: 'json-editor.errors.required' } : undefined;
      return;
    }
    if (!Array.isArray(this.value)) {
      this.error = { key: 'json-editor.errors.not-a-byte-array' };
      return;
    }
    const hasWrongItems = this.value.some((item) => {
      if (item === '') {
        return true;
      }
      const n = Number(item);
      return !Number.isInteger(n) || n < 0 || n > 255;
    });
    if (hasWrongItems) {
      this.error = { key: 'json-editor.errors.not-a-byte-array' };
      return;
    }
    this.error = undefined;
  }

  setEditString(value: string) {
    this.editString = value;
    if (value === '') {
      this.value = undefined;
    } else {
      this.value = value.split(',').map((item) => item.trim());
    }
    this.isDirty = this.value !== this._initialValue;
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
    this.value = [];
  }

  get hasErrors(): boolean {
    return !!this.error;
  }

  commit(): void {
    this._initialValue = this.value;
    this.isDirty = false;
  }

  reset(): void {
    this.value = this._initialValue;
    this.isDirty = false;
    this._checkConstraints();
  }
}
