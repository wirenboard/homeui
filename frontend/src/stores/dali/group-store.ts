import { runInAction, makeObservable, observable, action } from 'mobx';
import { daliProxy } from '@/services';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';
import { BaseItemStore } from './base-item-store';
import type { BusStore } from './bus-store';
import { relativizeTcLimitPaths } from './tc-limit-paths';
import type { GroupDetailed, GroupReply } from './types';

const isEmptyObject = (value: unknown) => (
  typeof value === 'object' && value !== null && !Object.keys(value).length
);

/** SetGroup answers with an empty config and schema when the write took the group away. */
const isGroupGone = (data: GroupDetailed) => (
  isEmptyObject(data?.config) && isEmptyObject(data?.schema)
);

/** Both GetGroup shapes are in the field: the older bare schema, the newer {config, schema}. */
const isWrapped = (reply: GroupReply): reply is GroupDetailed => {
  const schema = (reply as GroupDetailed)?.schema;
  return typeof schema === 'object' && schema !== null;
};

export class GroupStore extends BaseItemStore {
  readonly type = 'group' as const;
  public index: number;
  #parent: BusStore | null;

  constructor(id: string, groupIndex: number, parent: BusStore | null = null) {
    super(id, String(groupIndex));
    this.index = groupIndex;
    this.#parent = parent;

    makeObservable(this, {
      load: action,
      saveParam: action,
      isLoading: observable,
      error: observable,
      objectStore: observable.ref,
      isAwaitingMembers: observable,
    });
  }

  get parent(): BusStore | null {
    return this.#parent;
  }

  /**
   * The daemon publishes each group as a virtual device — "<bus>_group_NN" —
   * whose controls act on every member at once. The formula mirrors
   * wb-mqtt-dali's GroupVirtualDevice mqtt id and must stay in step with it.
   */
  get controlsMqttId(): string | null {
    return this.#parent ? `${this.#parent.id}_group_${String(this.index).padStart(2, '0')}` : null;
  }

  /**
   * GetGroup merges parameters over the group's members that have finished
   * initializing; while none has, it legitimately answers an empty schema.
   * That answer is a moment, not a fact — it must never be cached as the
   * group's real (absent) configuration.
   */
  isAwaitingMembers = false;

  async load() {
    if (this.objectStore && !this.isAwaitingMembers) {
      return;
    }
    this.isLoading = true;
    try {
      const reply = await daliProxy.GetGroup({ groupId: this.id });
      this.translator = new Translator();
      const wrapped = isWrapped(reply);
      const rawSchema = wrapped ? reply.schema : reply;
      const schema = loadJsonSchema(rawSchema);
      if (schema) {
        relativizeTcLimitPaths(schema);
        this.translator.addTranslations(schema.translations);
        runInAction(() => {
          this.objectStore = new ObjectStore(schema, wrapped ? reply.config : {}, false, new StoreBuilder());
          if (!wrapped) {
            // the bare-schema reply carries no config, so seed the schema defaults
            this.objectStore.setDefault();
          }
        });
      }
      runInAction(() => {
        const properties = (rawSchema as { properties?: object } | undefined)?.properties;
        this.isAwaitingMembers = !Object.keys(properties ?? {}).length;
      });
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
      const data = await daliProxy.SetGroup({ groupId: this.id, config: { [key]: param.store.value } });
      if (isGroupGone(data)) {
        // Dropping it from the bus also moves the page's selection off it (see DaliPageStore).
        runInAction(() => {
          this.setError(null);
          this.#parent?.removeGroup(this);
        });
        return;
      }
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
