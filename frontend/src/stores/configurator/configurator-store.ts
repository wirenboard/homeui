import { makeAutoObservable } from 'mobx';
import type { DeviceDraft } from './types';

// did 0–9 зарезервированы (как корневой узел Matter / bridge aid в HomeKit) — старт с 10.
const FIRST_DID = 10;
const DEFAULT_ADAPTERS: Record<string, boolean> = { matter: true, alice: false };

export default class ConfiguratorStore {
  devices: DeviceDraft[] = [];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  addDevice(type: string, name: string) {
    const did = Math.max(FIRST_DID - 1, ...this.devices.map((device) => device.did)) + 1;
    this.devices.push({
      did,
      name,
      type,
      module: '',
      area: undefined,
      adapters: { ...DEFAULT_ADAPTERS },
      bindings: {},
      ranges: {},
    });
  }

  // Discovery-first: завести устройство сразу из контрола (тип по роли, контрол привязан, module задан).
  addDeviceFromControl(type: string, role: string, cellId: string, module: string, name: string) {
    const did = Math.max(FIRST_DID - 1, ...this.devices.map((device) => device.did)) + 1;
    this.devices.push({
      did,
      name,
      type,
      module,
      area: undefined,
      adapters: { ...DEFAULT_ADAPTERS },
      bindings: { [role]: cellId },
      ranges: {},
    });
  }

  removeDevice(did: number) {
    this.devices = this.devices.filter((device) => device.did !== did);
  }

  setName(did: number, name: string) {
    const device = this._device(did);
    if (device) {
      device.name = name;
    }
  }

  setModule(did: number, module: string) {
    const device = this._device(did);
    if (device) {
      device.module = module;
    }
  }

  // Автоподсказка группировки: подставить module по контролу, если оператор его ещё не задал.
  setModuleIfEmpty(did: number, module: string) {
    const device = this._device(did);
    if (device && !device.module.trim()) {
      device.module = module;
    }
  }

  setArea(did: number, area: string) {
    const device = this._device(did);
    if (device) {
      device.area = area || undefined;
    }
  }

  setAdapter(did: number, key: string, value: boolean) {
    const device = this._device(did);
    if (device) {
      device.adapters[key] = value;
    }
  }

  bindSlot(did: number, role: string, cellId: string) {
    const device = this._device(did);
    if (!device) {
      return;
    }
    if (cellId) {
      device.bindings[role] = cellId;
    } else {
      delete device.bindings[role];
      delete device.ranges[role];
    }
  }

  setRange(did: number, role: string, range: { min: number; max: number; step: number }) {
    const device = this._device(did);
    if (device) {
      device.ranges[role] = range;
    }
  }

  // Заменить черновики целиком — используется при подгрузке сохранённого конфига с контроллера.
  setDevices(devices: DeviceDraft[]) {
    this.devices = devices;
  }

  clear() {
    this.devices = [];
  }

  // --- Private ---
  private _device(did: number): DeviceDraft | undefined {
    return this.devices.find((device) => device.did === did);
  }
}
