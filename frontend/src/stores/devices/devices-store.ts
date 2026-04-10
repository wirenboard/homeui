import { makeAutoObservable, runInAction } from 'mobx';
import type { MqttClient } from '@/common/types';
import Cell from './cell';
import Device from './device';
import { isTopicsAreEqual, splitTopic } from './helpers';
import type { ValueType } from './types';

export default class DevicesStore {
  public devices: Map<string, Device> = new Map();
  public cells: Map<string, Cell> = new Map();

  #cellValueSubscribers: Set<(cellId: string, value: ValueType) => void> = new Set();
  #allDevicesTopics: Map<string, { deviceTopics: Set<string>; cellTopics: Set<string> }> = new Map();
  #mqttClient: MqttClient;

  constructor(mqttClient: MqttClient) {
    this.#mqttClient = mqttClient;

    // add subscription to all the topics of devices
    this.#mqttClient.addStickySubscription('/devices/#', ({ topic, payload }: { topic: string; payload: string }) => {
      const { deviceId } = splitTopic(topic);

      const topics = this.#getOrCreateTopics(deviceId);
      if (topic.includes('/controls/')) {
        topics.cellTopics.add(topic);
      } else {
        topics.deviceTopics.add(topic);
      }

      this.#getSubscriptionHandlers(topic, payload).forEach(({ handledTopic, handler }) => {
        if (isTopicsAreEqual(topic, handledTopic)) {
          handler(payload);
        }
      });
    });

    makeAutoObservable(this, {}, { autoBind: true });
  }

  get filteredDevices() {
    const showSystemDevices = localStorage.getItem('show-system-devices') === 'yes';
    if (showSystemDevices) {
      return this.devices;
    }

    return new Map(
      Array.from(this.devices.entries())
        .filter(([_, device]) => !device.isSystemDevice)
        .sort(([_1, device1], [_2, device2]) => device1.name.localeCompare(device2.name))
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
      .sort((a, b) => a.id.localeCompare(b.id));

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
      this.#mqttClient.send(topic, '', true, 2);
    }

    const sortedDeviceTopics = Array.from(deviceTopics)
      .sort((a, b) => b.length - a.length);

    for (const topic of sortedDeviceTopics) {
      this.#mqttClient.send(topic, '', true, 2);
    }

    this.#allDevicesTopics.delete(id);
  }

  get topics(): any[] {
    const result = [];

    for (const device of this.devices.values()) {
      const options = [];

      for (const cellId of device.cells) {
        const cell = this.cells.get(cellId);
        if (!cell || cell.hidden) continue;

        options.push({
          value: cell.id,
          label: `${cell.name} [${cell.id}]`,
        });
      }

      result.push({
        label: device.name,
        options,
      });
    }

    return result;
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

  get controls() {
    return Array.from(this.cells.values())
      .filter((cell) => !cell.id.startsWith('system__') && !cell.hidden)
      .map((cell) => ({ id: cell.id, name: `${this.devices.get(cell.deviceId)?.name} / ${cell.name}` }));
  }

  async sendCellValueUpdate(deviceId: string, controlId: string, value: string) {
    const topic = `/devices/${deviceId}/controls/${controlId}/on`;
    await this.#mqttClient.send(topic, value, false);
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
        this.devices.set(id, new Device(id));
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

  #getCellFromTopic(topic: string) {
    const { cellId } = splitTopic(topic);
    return this.#getOrCreateCell(cellId);
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
    if (cell.isComplete && this.devices.has(cell.deviceId)) {
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

  // define handler functions for each specific topic
  #getSubscriptionHandlers(topic: string, payload: string) {
    const { deviceId } = splitTopic(topic);

    const deviceTopicBase = '/devices/+';
    const cellTopicBase = `${deviceTopicBase}/controls/+`;

    const cell = this.#getCellFromTopic(topic);

    return [
      {
        handledTopic: `${deviceTopicBase}/meta`,
        handler: () => {
          if (payload) {
            const device = this.#getOrCreateDevice(deviceId);
            device.setMeta(payload);
            device.explicit = true;
          } else if (this.devices.has(deviceId)) {
            this.devices.get(deviceId).explicit = false;
            this.#maybeRemoveDevice(deviceId);
          }
        },
      },
      {
        handledTopic: `${deviceTopicBase}/meta/name`,
        handler: () => {
          if (payload) {
            const device = this.#getOrCreateDevice(deviceId);
            device.name = payload;
            device.explicit = true;
          } else if (this.devices.has(deviceId)) {
            this.devices.get(deviceId).name = deviceId;
            this.devices.get(deviceId).explicit = false;
            this.#maybeRemoveDevice(deviceId);
          }
        },
      },
      {
        handledTopic: cellTopicBase,
        handler: (message: string) => {
          cell.receiveValue(message);
          this.#updateCellCompleteness(cell);
          this.#notifyCellValueChange(cell.id, cell.value);
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta`,
        handler: (message: string) => {
          if (message) {
            cell.setMeta(message);
            this.#updateCellCompleteness(cell);
          } else {
            this.#removeCellFromDevice(cell.id, cell.deviceId);
          }
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta/type`,
        handler: (message: string) => {
          cell.setType(message);
          this.#updateCellCompleteness(cell);
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta/name`,
        handler: (message: string) => {
          cell.setName(message);
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta/units`,
        handler: (message: string) => {
          cell.setUnits(message);
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta/readonly`,
        handler: (message: string) => {
          if (['', '0', '1'].includes(message)) {
            cell.setReadOnly(message ? Boolean(Number(message)) : null);
          } else {
            console.warn(`${topic} payload is neither '0', '1' nor empty`);
          }
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta/writable`,
        handler: () => {
          console.warn(`${topic}: meta/writable is not supported anymore. Use meta/readonly=0`);
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta/error`,
        handler: (message: string) => {
          cell.setError(message);
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta/min`,
        handler: (message: string) => {
          cell.setMin(message);
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta/max`,
        handler: (message: string) => {
          cell.setMax(message);
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta/precision`,
        handler: (message: string) => {
          cell.setStep(message);
        },
      },
      {
        handledTopic: `${cellTopicBase}/meta/order`,
        handler: (message: string) => {
          cell.setOrder(message);
        },
      },
    ];
  }
}
