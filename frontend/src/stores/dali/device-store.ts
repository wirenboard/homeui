import { runInAction, makeObservable, observable, action } from 'mobx';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';
import { BaseItemStore, ItemType } from './base-item-store';
import type { BusStore } from './bus-store';

export class DeviceStore extends BaseItemStore {
  readonly type = ItemType.Device;

  // Array of group indexes that this device belongs to (e.g. 0, 1, etc.)
  public groups: number[] = [];

  #parent: BusStore | null;

  constructor(daliProxy: any, id: string, name: string, groups: number[] = [], parent: BusStore | null = null) {
    super(daliProxy, id, name);
    this.groups = groups;
    this.#parent = parent;
    makeObservable(this, {
      load: action,
      save: action,
      resetSettings: action,
      reset: action,
      dropCache: action,
      setError: action,
      isLoading: observable,
      error: observable,
      label: observable,
      groups: observable.shallow,
    });
  }

  get parent(): BusStore | null {
    return this.#parent;
  }

  async load(forceReload = false) {
    if (this.objectStore && !forceReload) {
      return;
    }
    this.isLoading = true;
    try {
      const params: Record<string, unknown> = { deviceId: this.id };
      if (forceReload) {
        params.forceReload = true;
      }
      const data = await this.daliProxy.GetDevice(params);
      this.translator = new Translator();
      const schema = loadJsonSchema(data.schema);
      this.translator.addTranslations(schema.translations);
      this.objectStore = new ObjectStore(schema, data.config, false, new StoreBuilder());
      this.setError(null);
      runInAction(() => {
        this.label = data.name || this.label;
        this.updateGroups((data.config as any).groups);
        this.#parent?.syncGroupChildren();
      });
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
      const data = await this.daliProxy.SetDevice({ deviceId: this.id, config: this.objectStore.value });
      runInAction(() => {
        this.objectStore.setValue(data);
        this.objectStore.commit();
        this.setError(null);
        this.label = data.name || this.label;
        this.updateGroups(data.groups);
        this.#parent?.syncGroupChildren();
      });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  dropCache() {
    this.objectStore = null;
  }

  async identify() {
    try {
      await this.daliProxy.IdentifyDevice({ deviceId: this.id });
    } catch (error) {
      this.setError(error);
    }
  }

  async resetSettings() {
    try {
      await this.daliProxy.ResetDeviceSettings({ deviceId: this.id });
      this.setError(null);
    } catch (error) {
      this.setError(error);
      return;
    }
    await this.load(true);
  }

  async reset() {
    try {
      await this.daliProxy.ResetDevice({ deviceId: this.id });
      runInAction(() => {
        const parent = this.#parent;
        if (parent) {
          parent.children = parent.children.filter((child) => child !== this);
          parent.syncGroupChildren();
          parent.objectStore = null;
        }
        this.setError(null);
      });
    } catch (error) {
      this.setError(error);
    }
  }

  private updateGroups(groups: boolean[] | undefined) {
    if (!groups) {
      return;
    }
    // groups is a boolean array where the index is the group number;
    // true means the device belongs to that group
    this.groups = groups
      .map((inGroup, index) => inGroup ? index : null)
      .filter((g): g is number => g !== null);
  }
}
