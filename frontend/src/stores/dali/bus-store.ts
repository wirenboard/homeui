import { runInAction, makeObservable, observable, action } from 'mobx';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';
import { BaseItemStore, ItemType } from './base-item-store';
import { DeviceStore } from './device-store';
import { GroupStore } from './group-store';
import { MonitorStore } from './monitor-store'

export class BusStore extends BaseItemStore {
  readonly type = ItemType.Bus;
  public children: (DeviceStore | GroupStore)[] = [];
  public busMonitor: MonitorStore | null = null;

  constructor(daliProxy: any, id: string, name: string, mqttClient: any) {
    super(daliProxy, id, name);
    this.busMonitor = new MonitorStore(mqttClient);
    makeObservable(this, {
      load: action,
      save: action,
      scan: action,
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
      const data = await this.daliProxy.GetBus({ busId: this.id });
      this.translator = new Translator();
      const schema = loadJsonSchema(data.schema);
      this.translator.addTranslations(schema.translations);
      this.objectStore = new ObjectStore(schema, data.config, false, new StoreBuilder());
      this.setError(null);
      this.label = data.name || this.label;
      if (data.config.bus_monitor_enabled) {
        this.busMonitor.enableMonitoring(this.id);
      } else {
        this.busMonitor.disableMonitoring();
      }
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
      const data = await this.daliProxy.SetBus({ busId: this.id, config: this.objectStore.value });
      this.objectStore.setValue(data);
      this.objectStore.commit();
      this.setError(null);
      this.label = data.name || this.label;
      if (data.config.bus_monitor_enabled) {
        this.busMonitor.enableMonitoring(this.id);
      } else {
        this.busMonitor.disableMonitoring();
      }
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async scan() {
    this.isLoading = true;
    try {
      const res = await this.daliProxy.ScanBus({ busId: this.id });
      runInAction(() => {
        this.children = res.devices.map((device) =>
          new DeviceStore(this.daliProxy, device.id, device.name, device.groups ?? [], this)
        );
        this.syncGroupChildren();
        this.setError(null);
      });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  syncGroupChildren() {
    const activeGroupNums = new Set<number>(
      this.children
        .filter((c): c is DeviceStore => c.type === ItemType.Device)
        .flatMap(d => d.groups)
    );
    // Remove group children that have no devices left
    this.children = this.children.filter(c => {
      if (c.type !== ItemType.Group) {
        return true;
      }
      return activeGroupNums.has(c.index);
    });
    // Add group children for active groups not yet in children
    const existingGroupIndexes = new Set(
      this.children
        .filter((c): c is GroupStore => c.type === ItemType.Group)
        .map(c => c.index)
    );
    const groupIndexesToAdd: number[] = Array.from(activeGroupNums.keys()).filter(index => !existingGroupIndexes.has(index));
    groupIndexesToAdd.forEach(index => {
      this.children.push(new GroupStore(this.daliProxy, this.makeGroupId(index), index));
    });
    this.children.sort((a, b) => {
      if (a.type !== ItemType.Group || b.type !== ItemType.Group) {
        return a.type === ItemType.Group ? 1 : b.type === ItemType.Group ? -1 : 0;
      }
      return a.index - b.index;
    });
  }

  private makeGroupId(groupNum: number): string {
    return `${this.id}_g${groupNum}`;
  }
}
