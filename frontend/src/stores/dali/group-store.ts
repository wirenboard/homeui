import { runInAction, makeObservable, observable, action } from 'mobx';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';
import { BaseItemStore } from './base-item-store';

export class GroupStore extends BaseItemStore {
  readonly type = 'group' as const;
  public index: number;

  constructor(daliProxy: any, id: string, group_index: number) {
    // Group label is its index, since group name is not editable
    super(daliProxy, id, String(group_index));
    this.index = group_index;

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
      runInAction(() => { this.isLoading = false; });
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
    } catch (error) {
      this.setError(error);
    }
  }
}
