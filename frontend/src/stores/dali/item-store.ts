import { runInAction, makeObservable, observable } from 'mobx';
import { formatError } from '@/utils/formatError';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';

export class ItemStore {
  public objectStore: ObjectStore | null = null;
  public translator: Translator | null = null;
  public isLoading = true;
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
      error: observable,
    });
  }

  async load(forceReload: boolean = false) {
    if (this.objectStore && !forceReload) {
      return;
    }
    this.isLoading = true;
    try {
        const methods = {
          gateway: 'GetGateway',
          bus: 'GetBus',
          device: 'GetDevice',
          group: 'GetGroup',
        };
      let params: Record<string, unknown> = { [this.type + 'Id']: this.id };
      if (forceReload && this.type === 'device') {
        params = { ...params, forceReload: true };
      }
      const data = await this.#daliProxy[methods[this.type]](params);
      this.translator = new Translator();
      const schema = loadJsonSchema(data.schema);
      this.translator.addTranslations(schema.translations)
      this.objectStore = new ObjectStore(schema, data.config, false, new StoreBuilder());
      this.setError(null);
      this.label = data.name || this.label;
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async save() {
    if (!this.objectStore) {
      return;
    }
    this.isLoading = true;
    try {
        const methods = {
          gateway: 'SetGateway',
          bus: 'SetBus',
          device: 'SetDevice',
          group: 'SetGroup',
        };
      const params = { 
        [this.type + 'Id']: this.id, 
        config: this.objectStore.value
      };
      const data = await this.#daliProxy[methods[this.type]](params);
      this.objectStore.setValue(data);
      this.objectStore.commit();
      this.setError(null);
      this.label = data.name || this.label;
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
      this.isLoading = true;
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
        this.isLoading = false;
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
