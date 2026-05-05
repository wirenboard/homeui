import { runInAction, makeObservable, observable, action, computed } from 'mobx';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';
import { BaseItemStore, ItemType } from './base-item-store';
import { DeviceStore } from './device-store';
import { GroupStore } from './group-store';
import { MonitorStore } from './monitor-store';
import type { CommissioningState } from './types';

const IDLE_COMMISSIONING_STATE: CommissioningState = {
  status: 'idle',
  progress: 0,
  error: null,
  device_count: 0,
  devices: null,
  finished_at: null,
};

export class BusStore extends BaseItemStore {
  readonly type = ItemType.Bus;
  public children: (DeviceStore | GroupStore)[] = [];
  public busMonitor: MonitorStore | null = null;

  public pollingInterval: number = 5;
  public busMonitorEnabled: boolean = false;
  public broadcastSettingsVisible: boolean = false;

  public isParametersSchemaLoading: boolean = false;

  public commissioningState: CommissioningState = IDLE_COMMISSIONING_STATE;
  public scanStartRequested: boolean = false;
  public scanStopRequested: boolean = false;

  private isFirstLoad: boolean = true;
  #mqttClient: any;
  #commissioningTopic: string;
  #commissioningHandler: ((msg: { topic: string; payload: string }) => void) | null = null;

  constructor(
    daliProxy: any,
    id: string,
    name: string,
    mqttClient: any,
    commissioning?: CommissioningState,
  ) {
    super(daliProxy, id, name);
    this.busMonitor = new MonitorStore(mqttClient);
    this.#mqttClient = mqttClient;
    this.#commissioningTopic = `/wb-dali/${id}/commissioning`;
    makeObservable(this, {
      load: action,
      scan: action,
      stopScan: action,
      saveParam: action,
      setPollingInterval: action,
      setBusMonitorEnabled: action,
      applyCommissioningState: action,
      syncGroupChildren: action,
      setError: action,
      isLoading: observable,
      isParametersSchemaLoading: observable,
      commissioningState: observable,
      scanStartRequested: observable,
      scanStopRequested: observable,
      isScanning: computed,
      error: observable,
      label: observable,
      children: observable.shallow,
      pollingInterval: observable,
      busMonitorEnabled: observable,
      broadcastSettingsVisible: observable,
    });

    this.commissioningState = commissioning ?? IDLE_COMMISSIONING_STATE;
    this.subscribeToCommissioning();
  }

  get isScanning(): boolean {
    return !['idle', 'completed', 'failed', 'cancelled'].includes(this.commissioningState.status) || this.scanStartRequested;
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

  async setBusMonitorEnabled(value: boolean) {
    const prev = this.busMonitorEnabled;
    this.busMonitorEnabled = value;
    const configUpdate: Record<string, unknown> = { bus_monitor_enabled: value };
    this._updateMonitor(configUpdate);
    try {
      await this.daliProxy.SetBus({ busId: this.id, config: configUpdate });
      this.setError(null);
    } catch (error) {
      runInAction(() => {
        this.busMonitorEnabled = prev;
      });
      this._updateMonitor({ bus_monitor_enabled: prev });
      this.setError(error);
    }
  }

  async load() {
    if (this.objectStore) {
      return;
    }
    try {
      if (!this.objectStore) {
        if (this.isFirstLoad) {
          this.isLoading = true;
        } else {
          this.isParametersSchemaLoading = true;
        }
      }
      const data = await this.daliProxy.GetBus({ busId: this.id });
      if (this.isFirstLoad) {
        this._applyConfig(data.config);
        this._updateMonitor(data.config);
        runInAction(() => {
          this.isFirstLoad = false;
        });
      }
      this.translator = new Translator();
      const schema = loadJsonSchema(data.schema);
      if (schema) {
        this.translator.addTranslations(schema.translations);
        this.objectStore = new ObjectStore(schema, data.config, false, new StoreBuilder());
      }
      this.setError(null);
      runInAction(() => {
        this.label = data.name || this.label;
      });
    } catch (error) {
      this.setError(error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
        this.isParametersSchemaLoading = false;
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
      await this.daliProxy.SetBus({ busId: this.id, config: { [key]: param.store.value } });
      runInAction(() => {
        param.store.commit();
        this.setError(null);
      });
      this.dropDeviceCaches();
    } catch (error) {
      this.setError(error);
    }
  }

  dropDeviceCaches(groupIndex?: number) {
    for (const child of this.children) {
      if (child.type === ItemType.Device && (groupIndex === undefined || child.groups.includes(groupIndex))) {
        child.dropCache();
      }
    }
  }

  async scan() {
    this.scanStartRequested = true;
    try {
      await this.daliProxy.ScanBus({ busId: this.id });
      this.setError(null);
    } catch (error) {
      runInAction(() => {
        this.scanStartRequested = false;
      });
      this.setError(error);
    }
  }

  async stopScan() {
    this.scanStopRequested = true;
    try {
      await this.daliProxy.StopScanBus({ busId: this.id });
      this.setError(null);
    } catch (error) {
      runInAction(() => {
        this.scanStopRequested = false;
      });
      this.setError(error);
    }
  }

  destroy() {
    this.unsubscribeFromCommissioning();
  }

  syncGroupChildren() {
    const activeGroupNums = new Set<number>(
      this.children
        .filter((c): c is DeviceStore => c.type === ItemType.Device)
        .flatMap((d) => d.groups),
    );
    this.children = this.children.filter((c) => {
      if (c.type !== ItemType.Group) {
        return true;
      }
      return activeGroupNums.has(c.index);
    });
    const existingGroupIndexes = new Set(
      this.children
        .filter((c): c is GroupStore => c.type === ItemType.Group)
        .map((c) => c.index),
    );
    const groupIndexesToAdd: number[] = Array.from(activeGroupNums.keys()).filter((index) => !existingGroupIndexes.has(index));
    groupIndexesToAdd.forEach((index) => {
      this.children.push(new GroupStore(this.daliProxy, this.makeGroupId(index), index, this));
    });
    this.children.sort((a, b) => {
      if (a.type !== ItemType.Group || b.type !== ItemType.Group) {
        return a.type === ItemType.Group ? 1 : b.type === ItemType.Group ? -1 : 0;
      }
      return a.index - b.index;
    });
  }

  async applyCommissioningState(newState: CommissioningState) {
    this.commissioningState = newState;
    this.scanStartRequested = false;
    this.scanStopRequested = false;
    if ('completed' === newState.status) {
      this.children = newState.devices.map((device: { id: string; name: string; groups: number[] }) =>
        new DeviceStore(this.daliProxy, device.id, device.name, device.groups, this),
      );
      this.syncGroupChildren();
      this.setError(null);
      this.objectStore = null;
      await this.load();
    }
  }

  private subscribeToCommissioning() {
    this.#commissioningHandler = ({ payload }: { topic: string; payload: string }) => {
      if (!payload) {
        return;
      }
      let parsed: CommissioningState;
      try {
        parsed = JSON.parse(payload) as CommissioningState;
      } catch (error) {
        console.warn('Failed to parse commissioning payload', error);
        return;
      }
      this.applyCommissioningState(parsed);
    };
    this.#mqttClient.addStickySubscription(this.#commissioningTopic, this.#commissioningHandler);
  }

  private unsubscribeFromCommissioning() {
    if (this.#commissioningHandler) {
      this.#mqttClient.unsubscribe(this.#commissioningTopic);
      this.#commissioningHandler = null;
    }
  }

  private _applyConfig(config: Record<string, any>) {
    this.pollingInterval = config.polling_interval ?? 5;
    this.busMonitorEnabled = config.bus_monitor_enabled ?? false;
  }

  private _updateMonitor(config: Record<string, any>) {
    if (config.bus_monitor_enabled) {
      this.busMonitor!.enableMonitoring(this.id);
    } else {
      this.busMonitor!.disableMonitoring();
    }
  }

  private makeGroupId(groupNum: number): string {
    return `${this.id}_g${groupNum}`;
  }
}
