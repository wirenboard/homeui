import { runInAction, makeObservable, observable, action } from 'mobx';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';
import { BaseItemStore } from './base-item-store';
import type { BusStore } from './bus-store';

export class GroupStore extends BaseItemStore {
  readonly type = 'group' as const;
  public index: number;
  #parent: BusStore | null;

  constructor(daliProxy: any, id: string, groupIndex: number, parent: BusStore | null = null) {
    // Group label is its index, since group name is not editable
    super(daliProxy, id, String(groupIndex));
    this.index = groupIndex;
    this.#parent = parent;

    makeObservable(this, {
      load: action,
      saveParam: action,
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
      const data = await this.daliProxy.GetGroup({ groupId: this.id });
      this.translator = new Translator();
      const schema = loadJsonSchema(data);
      this.translator.addTranslations(schema.translations);
      this.objectStore = new ObjectStore(schema, {}, false, new StoreBuilder());
      this.objectStore.setDefault();
      this.setError(null);
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async saveParam(key: string) {
    if (!this.objectStore) {
      return;
    }
    const param = this.objectStore.getParamByKey(key);
    if (!param) {
      return;
    }
    try {
      await this.daliProxy.SetGroup({ groupId: this.id, config: { [key]: param.store.value } });
      runInAction(() => {
        param.store.commit();
        this.setError(null);
      });
      this.#parent?.dropDeviceCaches(this.index);
    } catch (error) {
      this.setError(error);
    }
  }
}
