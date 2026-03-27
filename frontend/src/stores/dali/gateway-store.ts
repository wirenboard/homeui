import { makeObservable, observable } from 'mobx';
import { BaseItemStore, ItemType } from './base-item-store';
import type { BusStore } from './bus-store';

export class GatewayStore extends BaseItemStore {
  readonly type = ItemType.Gateway;
  public children: BusStore[] = [];

  constructor(daliProxy: any, id: string, name: string) {
    super(daliProxy, id, name);
    makeObservable(this, {
      isLoading: observable,
      error: observable,
    });
  }

  async load() {}
}
