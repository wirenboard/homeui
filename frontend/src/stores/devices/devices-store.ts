import { makeAutoObservable, runInAction } from 'mobx';
import { type Option } from '@/components/dropdown';
import { mqttClient } from '@/services';
import Cell from './cell';
import Device from './device';
import { splitTopic } from './helpers';
import type { ValueType } from './types';

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

export default class DevicesStore {
  public devices: Map<string, Device> = new Map();
  public cells: Map<string, Cell> = new Map();

  #cellValueSubscribers: Set<(cellId: string, value: ValueType) => void> = new Set();
  #allDevicesTopics: Map<string, { deviceTopics: Set<string>; cellTopics: Set<string> }> = new Map();
  #pendingCellValues: Map<string, string> = new Map();
  #pendingMeta: { topic: string; payload: string }[] = [];
  #flushId: number | null = null;

  constructor() {
    mqttClient.addStickySubscription('/devices/#', ({ topic, payload }: { topic: string; payload: string }) => {
      const { deviceId } = splitTopic(topic);

      const topics = this.#getOrCreateTopics(deviceId);
      if (topic.includes('/controls/')) {
        topics.cellTopics.add(topic);
        const afterCtrl = topic.indexOf('/', topic.indexOf('/controls/') + 10);
        if (afterCtrl === -1) {
          this.#pendingCellValues.set(topic, payload);
        } else {
          this.#pendingMeta.push({ topic, payload });
        }
      } else {
        topics.deviceTopics.add(topic);
        this.#pendingMeta.push({ topic, payload });
      }

      if (this.#flushId !== null) return;
      if (typeof requestAnimationFrame === 'function') {
        this.#flushId = requestAnimationFrame(() => this.#flushMessages());
      } else {
        this.#flushMessages();
      }
    });

    makeAutoObservable(this, {}, { autoBind: true });
  }

  #flushMessages() {
    this.#flushId = null;
    const cellValues = this.#pendingCellValues;
    const meta = this.#pendingMeta;
    this.#pendingCellValues = new Map();
    this.#pendingMeta = [];

    runInAction(() => {
      for (const { topic, payload } of meta) {
        this.#dispatchMeta(topic, payload);
      }
      const hasSubscribers = this.#cellValueSubscribers.size > 0;
      cellValues.forEach((payload, topic) => {
        const parts = topic.split('/');
        const cell = this.#getOrCreateCell(`${parts[2]}/${parts[4]}`);
        const wasComplete = cell.isComplete;
        cell.receiveValue(payload);
        if (!wasComplete || !cell.isComplete) {
          this.#updateCellCompleteness(cell);
        }
        if (hasSubscribers) {
          this.#notifyCellValueChange(cell.id, cell.value);
        }
      });
    });
  }

  get filteredDevices() {
    const showSystemDevices = localStorage.getItem('show-system-devices') === 'yes';
    if (showSystemDevices) {
      return this.devices;
    }

    return new Map(
      Array.from(this.devices.entries())
        .filter(([_, device]) => !device.isServiceDevice)
        .sort(([_1, device1], [_2, device2]) => collator.compare(device1.name, device2.name)),
    );
  }

  subscribeOnCellValue(handler: (cellId: string, value: ValueType) => void) {
    this.#cellValueSubscribers.add(handler);
    return () => {
      this.#cellValueSubscribers.delete(handler);
    };
  }

  get filteredCells() {
    const showSystemDevices = localStorage.getItem('show-system-devices') === 'yes';
    let cells = Array.from(this.cells.values())
      .sort((a, b) => collator.compare(a.id, b.id));

    if (!showSystemDevices) {
      cells = cells.filter((cell) => !cell.isSystem && !cell.hidden);
    }

    return cells;
  }

  getDeviceCells(deviceId: string) {
    const device = this.devices.get(deviceId);
    if (!device) return [];

    const result: Cell[] = [];

    for (const cellId of device.cells) {
      const cell = this.cells.get(cellId);
      if (cell && !cell.hidden) {
        result.push(cell);
      }
    }

    result.sort((a, b) => {
      if (b.order === null) return -1;
      return (a.order ?? 1) - b.order;
    });

    return result;
  }

  deleteDevice(id: string) {
    const entry = this.#allDevicesTopics.get(id);
    if (!entry) return;

    const { cellTopics, deviceTopics } = entry;

    for (const topic of cellTopics) {
      mqttClient.send(topic, '', true, 2);
    }

    const sortedDeviceTopics = Array.from(deviceTopics)
      .sort((a, b) => b.length - a.length);

    for (const topic of sortedDeviceTopics) {
      mqttClient.send(topic, '', true, 2);
    }

    this.#allDevicesTopics.delete(id);
  }

  get topics(): Option<string>[] {
    const result: Option<string>[] = [];

    for (const device of this.devices.values()) {
      const options: Option<string>[] = [];

      for (const cellId of device.cells) {
        const cell = this.cells.get(cellId);
        if (!cell || cell.hidden) continue;

        options.push({
          value: cell.id,
          label: `${cell.name} [${cell.id}]`,
        });
      }

      if (options.length === 0) continue;

      result.push({
        label: device.name,
        options,
      });
    }

    return result;
  }

  // For end-user pickers (scenarios, widgets). Alice uses topics directly so
  // that system controls remain exportable to the smart home.
  get topicsWithoutSystem(): Option<string>[] {
    return this.topics
      .map((group) => {
        const options = 'options' in group ? group.options ?? [] : [];
        return {
          label: group.label,
          options: options.filter((opt) => !(opt.value as string).startsWith('system__')),
        };
      })
      .filter((group) => group.options.length > 0);
  }

  toggleDevices() {
    if (this.hasOpenedDivices) {
      this.devices.forEach((device) => {
        if (device.isVisible) {
          device.toggleDeviceVisibility();
        }
      });
    } else {
      this.devices.forEach((device) => {
        device.toggleDeviceVisibility();
      });
    }
  }

  get hasOpenedDivices() {
    return Array.from(this.filteredDevices.values()).some((device) => device.isVisible);
  }

  async sendCellValueUpdate(deviceId: string, controlId: string, value: string) {
    const topic = `/devices/${deviceId}/controls/${controlId}/on`;
    await mqttClient.send(topic, value, false);
  }

  #getOrCreateTopics(deviceId: string) {
    let entry = this.#allDevicesTopics.get(deviceId);

    if (!entry) {
      entry = {
        deviceTopics: new Set(),
        cellTopics: new Set(),
      };
      this.#allDevicesTopics.set(deviceId, entry);
    }

    return entry;
  }

  #notifyCellValueChange(cellId: string, value: ValueType) {
    for (const handler of this.#cellValueSubscribers) {
      handler(cellId, value);
    }
  }

  #getOrCreateDevice(id: string){
    if (!this.devices.has(id)) {
      runInAction(() => {
        this.devices.set(id, new Device(id, (cellId) => this.cells.get(cellId)));
      });
    }
    return this.devices.get(id);
  }

  #getOrCreateCell(id: string) {
    if (this.cells.has(id)) {
      return this.cells.get(id);
    }
    const cell = new Cell(id, this.sendCellValueUpdate);
    runInAction(() => {
      this.cells.set(id, cell);
    });

    return cell;
  }

  #addCellToDevice(cellId: string, deviceId: string){
    const device = this.#getOrCreateDevice(deviceId);
    runInAction(() => device.addCell(cellId));
  }

  #maybeRemoveDevice(id: string){
    if (!this.devices.has(id)) {
      return;
    }
    if (!this.devices.get(id).explicit && !this.devices.get(id).cells.size) {
      runInAction(() => this.devices.delete(id));
    }
  }

  #removeCellFromDevice(cellId: string, deviceId: string) {
    if (!this.devices.has(deviceId)) {
      return;
    }

    runInAction(() => {
      this.devices.get(deviceId).removeCell(cellId);
    });
  }

  #updateCellCompleteness(cell: Cell) {
    if (cell.isComplete) {
      this.#addCellToDevice(cell.id, cell.deviceId);
      return;
    }
    this.#removeCellFromDevice(cell.id, cell.deviceId);
    this.#maybeRemoveDevice(cell.deviceId);
    if (cell.type === 'incomplete' && cell.value === null) {
      runInAction(() => {
        this.cells.delete(cell.id);
      });
    }
  }

  #dispatchMeta(topic: string, payload: string) {
    const parts = topic.split('/');
    const deviceId = parts[2];

    if (parts[3] === 'meta') {
      if (parts.length === 4) {
        if (payload) {
          const device = this.#getOrCreateDevice(deviceId);
          device.setMeta(payload);
          device.setExplicit(true);
        } else if (this.devices.has(deviceId)) {
          this.devices.get(deviceId).explicit = false;
          this.#maybeRemoveDevice(deviceId);
        }
      } else if (parts[4] === 'name') {
        if (payload) {
          const device = this.#getOrCreateDevice(deviceId);
          device.name = payload;
          device.setExplicit(true);
        } else if (this.devices.has(deviceId)) {
          this.devices.get(deviceId).name = deviceId;
          this.devices.get(deviceId).setExplicit(false);
          this.#maybeRemoveDevice(deviceId);
        }
      } else if (parts[4] === 'error') {
        const device = this.#getOrCreateDevice(deviceId);
        device.setError(payload);
      }
      return;
    }

    if (parts[3] !== 'controls' || parts[5] !== 'meta') return;

    const cellId = `${deviceId}/${parts[4]}`;
    const cell = this.#getOrCreateCell(cellId);

    if (parts.length === 6) {
      if (payload) {
        cell.setMeta(payload);
        this.#updateCellCompleteness(cell);
      } else {
        this.#removeCellFromDevice(cell.id, cell.deviceId);
      }
      return;
    }

    switch (parts[6]) {
      case 'type':
        cell.setType(payload);
        this.#updateCellCompleteness(cell);
        break;
      case 'name':
        cell.setName(payload);
        break;
      case 'units':
        cell.setUnits(payload);
        break;
      case 'readonly':
        if (['', '0', '1'].includes(payload)) {
          cell.setReadOnly(payload ? Boolean(Number(payload)) : null);
        } else {
          console.warn(`${topic} payload is neither '0', '1' nor empty`);
        }
        break;
      case 'writable':
        console.warn(`${topic}: meta/writable is not supported anymore. Use meta/readonly=0`);
        break;
      case 'error':
        cell.setError(payload);
        break;
      case 'min':
        cell.setMin(payload);
        break;
      case 'max':
        cell.setMax(payload);
        break;
      case 'precision':
        cell.setStep(payload);
        break;
      case 'order':
        cell.setOrder(payload);
        break;
    }
  }

}
