import { action, makeObservable, observable, computed } from 'mobx';
import type { Option } from '@/components/dropdown';
import { MistypedValue } from './mistyped-value';
import { getDefaultNumberValue } from './schema-helpers';
import type { JsonSchema, ValidationError, PropertyStore } from './types';

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

  constructor(schema: JsonSchema, initialValue: unknown, required: boolean) {
    if (typeof initialValue === 'number') {
      this.value = initialValue;
      this.editString = String(initialValue);
    } else if (initialValue === undefined) {
      if (schema.options?.wb?.show_editor) {
        if (schema.options?.wb?.allow_undefined) {
          this.value = schema.default as number | undefined;
        } else {
          this.value = getDefaultNumberValue(schema);
        }
      }
      this.editString = this.value === undefined ? '' : String(this.value);
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
    });
  }

  _checkConstraints(): void {
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
    this.error = undefined;
  }

  setValue(value: number | string) {
    if (typeof value === 'string') {
      const parsedValue = Number(value);
      if (isNaN(parsedValue)) {
        this.value = new MistypedValue(value);
        this.editString = '';
      } else {
        this.value = parsedValue;
        this.editString = value;
      }
    } else {
      this.value = value;
      this.editString = String(value);
    }
    this.isDirty = this.value !== this._initialValue;
    this._checkConstraints();
  }

  setEditString(value: string) {
    this.editString = value;
    if (value === '') {
      this.value = undefined;
    } else {
      const parsedValue = Number(value);
      if (isNaN(parsedValue)) {
        this.value = new MistypedValue(value);
      } else {
        this.value = parsedValue;
      }
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
    this.setValue(getDefaultNumberValue(this.schema));
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
  }
}
