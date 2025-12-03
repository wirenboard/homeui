import { makeObservable, action, observable } from 'mobx';

export class BooleanStore {
  constructor({ name, value }) {
    this.type = 'boolean';
    this.name = name;
    this.formColumns = null;
    this.initialValue = !!value;

    this.setValue(value);

    makeObservable(this, {
      value: observable,
      initialValue: observable,
      formColumns: observable,
      setValue: action,
      setFormColumns: action,
    });
  }

  setValue(value) {
    this.value = !!value;
  }

  setFormColumns(columns) {
    this.formColumns = columns;
  }

  get isDirty() {
    return this.value !== this.initialValue;
  }

  submit() {
    this.initialValue = this.value;
  }

  reset() {
    this.setValue(this.initialValue);
  }
}
