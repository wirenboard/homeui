import { makeAutoObservable } from 'mobx';

export default class UiStore {
  public isConnected = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setIsConnected(isConnected: boolean) {
    this.isConnected = isConnected;
  }
}
