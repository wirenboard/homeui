import { runInAction, makeObservable, observable } from 'mobx';
import type { DaliProxy } from './types';
import { formatError } from '@/utils/formatError';
import { ErrorInfo } from '@/layouts/page';
import { ItemStore } from './item-store';

export class DaliStore {
  public gateways: ItemStore[] = [];
  public isLoading = true;
  public errors: ErrorInfo[];
  #daliProxy: DaliProxy;
  #whenMqttReady: () => Promise<void>;

  constructor(whenMqttReady: () => Promise<void>, daliProxy: DaliProxy) {
    this.#daliProxy = daliProxy;
    this.#whenMqttReady = whenMqttReady;

    makeObservable(this, {
      isLoading: observable,
      errors: observable,
    });
  }

  async load() {
    try {
      await this.#whenMqttReady();
      const gateways = await this.#daliProxy.GetList();
      gateways.forEach((gateway) => {
        const gatewayStore = new ItemStore(this.#daliProxy, gateway.id, gateway.name, 'gateway');
        gateway.buses.forEach((bus) => {
          const busStore = new ItemStore(this.#daliProxy, bus.id, bus.name, 'bus');
          bus.devices.forEach((device) => {
            const deviceStore = new ItemStore(this.#daliProxy, device.id, device.name, 'device');
            busStore.children.push(deviceStore);
          });
          gatewayStore.children.push(busStore);
        });
        this.gateways.push(gatewayStore);
      });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  setError(error: unknown) {
    if (!error) {
      this.errors = [];
      return;
    }
    this.errors = [{ variant: 'danger', text: formatError(error) }];
  }
}
