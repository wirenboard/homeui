import { makeObservable, action, computed, observable, type IObservableArray } from 'mobx';
import { type FormStore } from './form-store';

export class ArrayStore {
  public type = 'array';
  public name: string;
  public headers: string[];
  public items: IObservableArray<FormStore> = observable.array([]);
  public makeItemFormFn: () => FormStore;
  public contentIsChanged: boolean = false;

  constructor(name: string, headers: string[], makeItemFormFn: () => FormStore) {
    this.name = name;
    this.headers = headers;
    this.makeItemFormFn = makeItemFormFn;

    makeObservable(this, {
      items: observable,
      contentIsChanged: observable,
      add: action,
      remove: action,
      setValue: action,
      isDirty: computed,
      hasErrors: computed,
      value: computed,
    });
  }

  add() {
    this.items.push(this.makeItemFormFn());
    this.contentIsChanged = true;
  }

  remove(index: number) {
    this.items.splice(index, 1);
    this.contentIsChanged = true;
  }

  setValue(value: Record<string, unknown>[]) {
    this.items.replace(
      value.map((v) => {
        let form = this.makeItemFormFn();
        form.setValue(v);
        return form;
      }),
    );
    this.contentIsChanged = false;
  }

  get isDirty() {
    return this.contentIsChanged || this.items.some((v) => v.isDirty);
  }

  get hasErrors() {
    return this.items.some((v) => v.hasErrors);
  }

  get value() {
    return this.items.map((v) => v.value);
  }

  submit() {
    this.contentIsChanged = false;
    this.items.forEach((v) => v.submit());
  }

  reset() {
    this.contentIsChanged = false;
    this.items.forEach((v) => v.reset());
  }
}
