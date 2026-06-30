import { makeAutoObservable } from 'mobx';
import i18n from '@/i18n/config';
import { getFoldedDevices, isDefaultSystemDevice } from './helpers';
import { type DeviceMeta, DeviceType, type NameTranslations } from './types';

export default class Device {
  public id: string;
  public cells: Set<string> = new Set();
  public explicit: boolean = false;
  public isVisible: boolean = true;
  public type: DeviceType;
  private _name: string;
  private _nameTranslations: NameTranslations = {};

  constructor(id: string) {
    this.id = id;
    this.isVisible = !getFoldedDevices().includes(this.id);

    if (isDefaultSystemDevice(id) || this.isServiceDevice) {
      this.type = DeviceType.System;
    }

    makeAutoObservable(this, {}, { autoBind: true });
  }

  get name(): string {
    return this._nameTranslations[i18n.language] || this._nameTranslations.en || this._name || this.id;
  }

  set name(value: string) {
    this._name = value;
  }

  setMeta(meta: string): void {
    try {
      const parsedMeta: DeviceMeta = JSON.parse(meta);
      this._nameTranslations = parsedMeta.title || {};

      if (Object.values(DeviceType).includes(this.type)) {
        return;
      }

      if (parsedMeta.driver === 'wb-rules') {
        this.type = DeviceType.Virtual;
      } else if (parsedMeta.driver === 'wb-modbus') {
        this.type = DeviceType.Modbus;
      } else if (parsedMeta.driver === 'wb-mqtt-zigbee') {
        this.type = DeviceType.Modbus;
      }
    } catch (error) {
      console.error('Invalid meta format:', error);
    }
  }

  addCell(cellId: string) {
    this.cells.add(cellId);
  }

  removeCell(cellId: string) {
    this.cells.delete(cellId);
  }

  get isServiceDevice(): boolean {
    return this.id.startsWith('system__');
  }

  toggleDeviceVisibility() {
    const foldedDevices = getFoldedDevices();
    const updatedFoldedDevices = foldedDevices.includes(this.id)
      ? foldedDevices.filter((deviceId: string) => deviceId !== this.id)
      : [...foldedDevices, this.id];
    localStorage.setItem('foldedDevices', JSON.stringify(updatedFoldedDevices));
    this.isVisible = foldedDevices.includes(this.id);
  }

  getControls(): string[] {
    return [...this.cells].map((item) => item.replace(`${this.id}/`, ''));
  }
}
