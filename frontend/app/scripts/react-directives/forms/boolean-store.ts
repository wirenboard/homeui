import { makeObservable, action, observable } from 'mobx';

export class BooleanStore {
  public type?: string = 'boolean';
  public name?: string;
  public initialValue?: boolean;
  public formColumns?: number;
  public value?: boolean;

  constructor({ name, value }: Partial<BooleanStore>) {
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

  setValue(value: boolean) {
    this.value = !!value;
  }

  setFormColumns(columns: number) {
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
