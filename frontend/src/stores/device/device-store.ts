import { makeAutoObservable, runInAction } from 'mobx';
import { MqttClient } from '@/common/types';
import Cell from './cell';
import Device from './device';
import { isTopicsAreEqual, splitTopic } from './helpers';

export default class DeviceStore {
  public devices: Map<string, Device> = new Map();
  public cells: Map<string, Cell> = new Map();
  private _mqttClient: MqttClient;
  private _allDevicesTopics: { [key: string]: string[] } = {};

  constructor(mqttClient: MqttClient) {
    this._mqttClient = mqttClient;

    const getOrCreateDevice = (id: string) => {
      if (!this.devices.has(id)) {
        runInAction(() => {
          this.devices.set(id, new Device(id));
        });
      }
      return this.devices.get(id);
    };

    const sendCellValueUpdate = async (deviceId: string, controlId: string, value: string) => {
      const topic = `/devices/${deviceId}/controls/${controlId}/on`;
      await mqttClient.send(topic, value, false);
    };

    const getOrCreateCell = (id: string) => {
      if (this.cells.has(id)) {
        return this.cells.get(id);
      }
      const cell = new Cell(id, sendCellValueUpdate);
      runInAction(() => {
        this.cells.set(id, cell);
      });

      return cell;
    };

    const getCellFromTopic = (topic: string) => {
      const { deviceId, cellId } = splitTopic(topic);

      getOrCreateDevice(deviceId);
      return getOrCreateCell(cellId);
    };

    const addCellToDevice = (cellId: string, deviceId: string) => {
      const device = getOrCreateDevice(deviceId);
      if (!device.cellIds.includes(cellId)) {
        runInAction(() => device.cellIds.push(cellId));
      }
    };

    const maybeRemoveDevice = (id: string) => {
      if (!this.devices.has(id)) {
        return;
      }
      if (!this.devices.get(id).explicit && !this.devices.get(id).cellIds.length) {
        runInAction(() => this.devices.delete(id));
      }
    };

    const removeCellFromDevice = (cellId: string, deviceId: string) => {
      if (!this.devices.has(deviceId)) {
        return;
      }

      runInAction(() => {
        this.devices.get(deviceId).cellIds = this.devices.get(deviceId).cellIds.filter((id) => id !== cellId);
      });
    };

    const updateCellCompleteness = (cell: Cell) => {
      if (cell.isComplete) {
        addCellToDevice(cell.id, cell.deviceId);
        return;
      }
      removeCellFromDevice(cell.id, cell.deviceId);
      maybeRemoveDevice(cell.deviceId);
      if (cell.type === 'incomplete' && cell.value === null) {
        runInAction(() => {
          this.cells.delete(cell.id);
        });
      }
    };

    // add subscription to all the topics of devices
    mqttClient.addStickySubscription('/devices/#', ({ topic, payload }: { topic: string; payload: string }) => {
      const { deviceId } = splitTopic(topic);

      this._allDevicesTopics[deviceId] ||= [];
      if (!this._allDevicesTopics[deviceId].includes(topic)) {
        this._allDevicesTopics[deviceId].push(topic);
      }

      const deviceTopicBase = '/devices/+';
      const cellTopicBase = `${deviceTopicBase}/controls/+`;

      // define handler functions for each specific topic
      const subscriptionHandlers = [
        {
          handledTopic: `${deviceTopicBase}/meta`,
          handler: () => {
            if (payload) {
              const device = getOrCreateDevice(deviceId);
              device.setMeta(payload);
              device.explicit = true;
            } else if (this.devices.has(deviceId)) {
              this.devices.get(deviceId).explicit = false;
              maybeRemoveDevice(deviceId);
            }
          },
        },
        {
          handledTopic: `${deviceTopicBase}/meta/name`,
          handler: () => {
            if (payload) {
              const device = getOrCreateDevice(deviceId);
              device.name = payload;
              device.explicit = true;
            } else if (this.devices.has(deviceId)) {
              this.devices.get(deviceId).name = deviceId;
              this.devices.get(deviceId).explicit = false;
              maybeRemoveDevice(deviceId);
            }
          },
        },
        {
          handledTopic: cellTopicBase,
          handler: (message: string) => {
            const cell = getCellFromTopic(topic);
            cell.receiveValue(message);
            updateCellCompleteness(cell);
          },
        },
        {
          handledTopic: `${cellTopicBase}/meta`,
          handler: (message: string) => {
            getCellFromTopic(topic).setMeta(message);
          },
        },
        {
          handledTopic: `${cellTopicBase}/meta/type`,
          handler: (message: string) => {
            const cell = getCellFromTopic(topic);
            cell.setType(message);
            updateCellCompleteness(cell);
          },
        },
        {
          handledTopic: `${cellTopicBase}/meta/name`,
          handler: (message: string) => {
            getCellFromTopic(topic).setName(message);
          },
        },
        {
          handledTopic: `${cellTopicBase}/meta/units`,
          handler: (message: string) => {
            getCellFromTopic(topic).setUnits(message);
          },
        },
        {
          handledTopic: `${cellTopicBase}/meta/readonly`,
          handler: (message: string) => {
            if (['', '0', '1'].includes(message)) {
              getCellFromTopic(topic).setReadOnly(message ? Boolean(Number(message)) : null);
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
            getCellFromTopic(topic).setError(message);
          },
        },
        {
          handledTopic: `${cellTopicBase}/meta/min`,
          handler: (message: string) => {
            getCellFromTopic(topic).setMin(message);
          },
        },
        {
          handledTopic: `${cellTopicBase}/meta/max`,
          handler: (message: string) => {
            getCellFromTopic(topic).setMax(message);
          },
        },
        {
          handledTopic: `${cellTopicBase}/meta/precision`,
          handler: (message: string) => {
            getCellFromTopic(topic).setStep(message);
          },
        },
        {
          handledTopic: `${cellTopicBase}/meta/order`,
          handler: (message: string) => {
            const cell = getCellFromTopic(topic);
            cell.setOrder(message);
          },
        },
      ];

      subscriptionHandlers.forEach(({ handledTopic, handler }) => {
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

  getDeviceCells(deviceId: string) {
    if (!this.devices.has(deviceId)) {
      return [];
    }
    return Array.from(this.cells)
      .filter(([cellId]) => this.devices.get(deviceId).cellIds.includes(cellId))
      .map(([_, cell]) => cell)
      .sort((cellA: Cell, cellB: Cell) => (cellB.order === null ? -1 : (cellA.order || 1) - cellB.order));
  }

  deleteDevice(id: string) {
    // We have to delete cells first, then devices, so we should to sort topics
    const deviceTopics = this._allDevicesTopics[id].filter((topic) => !topic.includes('controls'))
      .sort((a: string, b: string) => b.length - a.length);
    const cellsTopics = this._allDevicesTopics[id].filter((topic) => topic.includes('controls'));

    runInAction(() => {
      [...cellsTopics, ...deviceTopics].forEach((topic) => {
        this._mqttClient.send(topic, '', true, 2);
      });
    });
  }

  get topics() {
    return Array.from(this.devices).map(([_deviceId, device]) => ({
      label: device.name,
      options: device.cellIds.reduce((cells, c) => {
        let cell = this.cells.get(c);
        if (cell) {
          cells.push({
            value: cell.id,
            label: `${cell.name} [${cell.id}]`,
          });
        }
        return cells;
      }, []),
    }));
  }
}
