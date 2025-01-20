import { makeAutoObservable } from 'mobx';
import i18n from '~/i18n/react/config';
import { DeviceMeta, NameTranslations } from './types';

export default class Device {
  public id: string;
  public cellIds: string[] = [];
  public explicit: boolean = false;
  public isVisible: boolean = true;
  private _name: string;
  private _nameTranslations: NameTranslations = {};

  constructor(id: string) {
    this.id = id;
    this.isVisible = JSON.parse(localStorage.getItem('visibleDevices')).devices[this.id]?.isOpen;

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
    } catch (error) {
      console.error('Invalid meta format:', error);
    }
  }

  get isSystemDevice(): boolean {
    return this.id.startsWith('system__');
  }

  toggleDeviceVisibility() {
    const devicesVisibility = JSON.parse(localStorage.getItem('visibleDevices'));
    devicesVisibility.devices = {
      ...devicesVisibility.devices,
      [this.id]: { isOpen: !devicesVisibility.devices[this.id]?.isOpen },
    };
    localStorage.setItem('visibleDevices', JSON.stringify(devicesVisibility));
    this.isVisible = devicesVisibility.devices[this.id].isOpen;
  }
}
