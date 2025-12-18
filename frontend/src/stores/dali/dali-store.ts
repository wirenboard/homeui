import { runInAction, makeObservable, observable } from 'mobx';
import type { DaliProxy } from './types';
import { formatError } from '@/utils/formatError';
import { ErrorInfo } from '@/layouts/page';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';

class ItemStore {
  public objectStore: ObjectStore | null = null;
  public translator: Translator | null = null;
  public isLoading = true;
  public scanInProgress = false;
  public label: string = '';
  public error: string | null = null;
  public children: ItemStore[] = [];
  
  readonly type: string;
  readonly id: string;
  
  #daliProxy: any;

  constructor(daliProxy: any, id: string, name: string, type: string) {
    this.#daliProxy = daliProxy;
    this.id = id;
    this.type = type;
    this.label = name;

    makeObservable(this, {
      isLoading: observable,
      scanInProgress: observable,
      error: observable,
    });
  }

  async load() {
    if (this.objectStore) {
      return;
    }
    try {
        const methods = {
          gateway: 'GetGateway',
          bus: 'GetBus',
          device: 'GetDevice',
          group: 'GetGroup',
        };
      const data = await this.#daliProxy[methods[this.type]]({ [this.type + 'Id']: this.id });
      this.translator = new Translator();
      const schema = loadJsonSchema(data.schema);
      this.translator.addTranslations(schema.translations)
      this.objectStore = new ObjectStore(schema, data.config, false, new StoreBuilder());
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async scan() {
    try {
      this.scanInProgress = true;
      const res = await this.#daliProxy.ScanBus({ busId: this.id });
      let devices =  [];
      res.devices.forEach((device) => {
        const deviceStore = new ItemStore(this.#daliProxy, device.id, device.name, 'device');
        devices.push(deviceStore);
      });
      this.children = devices;
      this.setError(null);
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.scanInProgress = false;
      });
    }
  }

  setError(error: unknown) {
    if (!error) {
      this.error = null;
      return;
    }
    this.error = formatError(error);
  }
}

export default class DaliStore {
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
