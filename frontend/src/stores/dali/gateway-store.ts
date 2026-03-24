import { runInAction, makeObservable, observable, action } from 'mobx';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';
import { BaseItemStore } from './base-item-store';
import type { BusStore } from './bus-store';

export class GatewayStore extends BaseItemStore {
  readonly type = 'gateway' as const;
  public children: BusStore[] = [];

  constructor(daliProxy: any, id: string, name: string) {
    super(daliProxy, id, name);
    makeObservable(this, {
      load: action,
      save: action,
      isLoading: observable,
      error: observable,
    });
  }

  async load() {
    if (this.objectStore) {
      return;
    }
    this.isLoading = true;
    try {
      const data = await this.daliProxy.GetGateway({ gatewayId: this.id });
      this.translator = new Translator();
      const schema = loadJsonSchema(data.schema);
      this.translator.addTranslations(schema.translations);
      this.objectStore = new ObjectStore(schema, data.config, false, new StoreBuilder());
      this.setError(null);
      this.label = data.name || this.label;
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async save() {
    if (!this.objectStore) {
      return;
    }
    this.isLoading = true;
    try {
      const data = await this.daliProxy.SetGateway({ gatewayId: this.id, config: this.objectStore.value });
      this.objectStore.setValue(data);
      this.objectStore.commit();
      this.setError(null);
      this.label = data.name || this.label;
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }
}
