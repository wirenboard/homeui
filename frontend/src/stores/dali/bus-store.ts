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

  public pollingInterval: number = 5;
  public websocketEnabled: boolean = false;
  public websocketPort: number | undefined = undefined;
  public busMonitorEnabled: boolean = false;
  public broadcastSettingsVisible: boolean = false;

  constructor(daliProxy: any, id: string, name: string, mqttClient: any) {
    super(daliProxy, id, name);
    this.busMonitor = new MonitorStore(mqttClient);
    makeObservable(this, {
      load: action,
      scan: action,
      saveParam: action,
      setPollingInterval: action,
      setWebsocketEnabled: action,
      setWebsocketPort: action,
      setBusMonitorEnabled: action,
      isLoading: observable,
      error: observable,
      pollingInterval: observable,
      websocketEnabled: observable,
      websocketPort: observable,
      busMonitorEnabled: observable,
      broadcastSettingsVisible: observable,
    });
  }

  async setPollingInterval(value: number) {
    try {
      await this.daliProxy.SetBus({ busId: this.id, config: { polling_interval: value } });
      runInAction(() => {
        this.pollingInterval = value;
        this.setError(null);
      });
    } catch (error) {
      this.setError(error);
    }
  }

  async setWebsocketEnabled(value: boolean) {
    const prev = this.websocketEnabled;
    this.websocketEnabled = value;
    await this._sendParam({ websocket_enabled: value }, () => { this.websocketEnabled = prev; });
  }

  async setWebsocketPort(value: number | undefined) {
    try {
      await this.daliProxy.SetBus({ busId: this.id, config: { websocket_port: value } });
      runInAction(() => {
        this.websocketPort = value;
        this.setError(null);
      });
    } catch (error) {
      this.setError(error);
    }
  }

  async setBusMonitorEnabled(value: boolean) {
    const prev = this.busMonitorEnabled;
    this.busMonitorEnabled = value;
    this._updateMonitor({ bus_monitor_enabled: value });
    await this._sendParam({ bus_monitor_enabled: value }, () => {
      this.busMonitorEnabled = prev;
      this._updateMonitor({ bus_monitor_enabled: prev });
    });
  }

  async load() {
    this.isLoading = true;
    try {
      const data = await this.daliProxy.GetBus({ busId: this.id });
      this._applyConfig(data.config);
      this._updateMonitor(data.config);
      this.translator = new Translator();
      const schema = loadJsonSchema(data.schema);
      if (schema) {
        this.translator.addTranslations(schema.translations);
        this.objectStore = new ObjectStore(schema, data.config, false, new StoreBuilder());
      }
      this.setError(null);
      this.label = data.name || this.label;
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
    this.isLoading = true;
    try {
      await this.daliProxy.SetBus({ busId: this.id, config: { [key]: param.store.value } });
      runInAction(() => {
        param.store.commit();
        this.setError(null);
      });
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
        this.children = res.devices.map((device: { id: string; name: string; groups?: number[] }) =>
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
    this.children = this.children.filter(c => {
      if (c.type !== ItemType.Group) {
        return true;
      }
      return activeGroupNums.has(c.index);
    });
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

  private _applyConfig(config: Record<string, any>) {
    this.pollingInterval = config.polling_interval ?? 5;
    this.websocketEnabled = config.websocket_enabled ?? false;
    this.websocketPort = config.websocket_port;
    this.busMonitorEnabled = config.bus_monitor_enabled ?? false;
  }

  private _updateMonitor(config: Record<string, any>) {
    if (config.bus_monitor_enabled) {
      this.busMonitor!.enableMonitoring(this.id);
    } else {
      this.busMonitor!.disableMonitoring();
    }
  }

  private async _sendParam(param: Record<string, unknown>, onError: () => void) {
    this.isLoading = true;
    try {
      await this.daliProxy.SetBus({ busId: this.id, config: param });
      this.setError(null);
    } catch (error) {
      runInAction(onError);
      this.setError(error);
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  private makeGroupId(groupNum: number): string {
    return `${this.id}_g${groupNum}`;
  }
}
