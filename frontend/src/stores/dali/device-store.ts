import { runInAction, makeObservable, observable, action } from 'mobx';
import { daliProxy } from '@/services';
import { type DaliDeviceDescription, type GetDeviceParams } from '@/stores/dali/types';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';
import { BaseItemStore, ItemType } from './base-item-store';
import type { BusStore } from './bus-store';

// The spinner delay of .dali-contentLoader. The picture is waited for only while the spinner is hidden,
// so it never makes the spinner show up.
const PICTURE_WAIT_MS = 300;

export const getDevicePictureUrl = (description: DaliDeviceDescription): string | null => {
  const key = description.gtin || description.oem_gtin;
  return key ? `/dali-images/${key}.webp` : null;
};

// Loads the picture into the browser cache, resolves on success, failure or timeout.
const preloadPicture = (url: string, waitMs: number) => new Promise<void>((resolve) => {
  const image = new Image();
  image.onload = () => resolve();
  image.onerror = () => resolve();
  image.src = url;
  setTimeout(resolve, waitMs);
});

export class DeviceStore extends BaseItemStore {
  readonly type = ItemType.Device;

  public groups: number[] = [];
  public mqttId: string | null = null;
  public description: DaliDeviceDescription | null = null;

  #parent: BusStore | null;

  constructor(id: string, name: string, groups: number[] = [], parent: BusStore | null = null) {
    super(id, name);
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
      mqttId: observable,
      description: observable.ref,
      objectStore: observable.ref,
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
    const startedAt = Date.now();
    try {
      const params: GetDeviceParams = { deviceId: this.id };
      if (forceReload) {
        params.forceReload = true;
      }
      const data = await daliProxy.GetDevice(params);
      const pictureUrl = getDevicePictureUrl(data.config);
      if (pictureUrl) {
        await preloadPicture(pictureUrl, PICTURE_WAIT_MS - (Date.now() - startedAt));
      }
      this.translator = new Translator();
      const schema = loadJsonSchema(data.schema);
      this.translator.addTranslations(schema.translations);
      this.setError(null);
      runInAction(() => {
        this.objectStore = new ObjectStore(schema, data.config, false, new StoreBuilder());
        this.label = data.name || this.label;
        this.mqttId = data.config.mqtt_id ?? null;
        this.description = data.config;
        this.updateGroups(data.config.groups);
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
      const data = await daliProxy.SetDevice({ deviceId: this.id, config: this.objectStore.value });
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
      await daliProxy.IdentifyDevice({ deviceId: this.id });
    } catch (error) {
      this.setError(error);
    }
  }

  async resetSettings() {
    try {
      await daliProxy.ResetDeviceSettings({ deviceId: this.id });
      this.setError(null);
    } catch (error) {
      this.setError(error);
      return;
    }
    await this.load(true);
  }

  async reset() {
    try {
      await daliProxy.ResetDevice({ deviceId: this.id });
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
