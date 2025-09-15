import { makeAutoObservable, runInAction } from 'mobx';
import { DefaultRoom } from '@/stores/alice';
import { generateNextId } from '@/utils/id';
import {
  addDevice,
  addRoom,
  deleteRoom,
  getAliceInfo,
  updateRoom,
  deleteDevice,
  updateDevice,
  checkIsAliceAvailable
} from './api';
import type {
  AddDeviceParams,
  AliceFetchData,
  AliceRoomUpdateParams,
  Room,
  SmartDevice,
  SuccessMessageFetch
} from './types';

export default class AliceStore {
  public isAvailable = undefined;
  public rooms = new Map<string, Room>();
  public devices = new Map<string, SmartDevice>();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async checkIsAvailable(): Promise<void> {
    const data = await checkIsAliceAvailable();

    runInAction(() => {
      this.isAvailable = data;
    });
  }

  async fetchData(): Promise<AliceFetchData> {
    const data = await getAliceInfo();

    return runInAction(() => {
      this.rooms = new Map(Object.entries(data.rooms).map(([id, room]) => [id, room]));
      this.devices = new Map(Object.entries(data.devices).map(([id, device]) => [id, device]));
      return data;
    });
  }

  async addRoom(name: string): Promise<string> {
    const room = await addRoom(name);

    return runInAction(() => {
      const key = Object.keys(room).at(0);
      this.rooms.set(key, room[key]);
      return key;
    });
  }

  async updateRoom(id: string, params: AliceRoomUpdateParams): Promise<void> {
    const room = await updateRoom(id, params);

    runInAction(() => {
      this.rooms.set(id, room);
    });
  }

  async deleteRoom(id: string): Promise<SuccessMessageFetch> {
    return deleteRoom(id);
  }

  async addDevice(data: AddDeviceParams): Promise<string> {
    const device = await addDevice(data);
    return Object.keys(device).at(0);
  }

  async updateDevice(id: string, params: Partial<SmartDevice>): Promise<SmartDevice> {
    return updateDevice(id, params);
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await deleteDevice(deviceId);

    runInAction(() => {
      const { room_id: roomId } = this.devices.get(deviceId);
      if (roomId && roomId !== DefaultRoom) {
        const room = this.rooms.get(roomId);
        room.devices = room.devices.filter((id) => id !== deviceId);
        this.rooms.set(roomId, room);
      }
      this.devices.delete(deviceId);
    });
  }

  async copyDevice(data: SmartDevice): Promise<string> {
    const name = generateNextId(
      Array.from(this.devices).map(([_key, device]) => device.name),
      data.name + ' '
    );
    const device = await addDevice({ ...data, name });

    return runInAction(() => {
      const key = Object.keys(device).at(0);
      const room = this.rooms.get(device[key].room_id);
      this.devices.set(key, device[key]);
      this.rooms.set(device[key].room_id, { name: room.name, devices: [...room.devices, key] });
      return key;
    });
  }
}
