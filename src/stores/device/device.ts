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
    this.isVisible = !JSON.parse(localStorage.getItem('foldedDevices')).includes(this.id);
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
    const foldedDevices = JSON.parse(localStorage.getItem('foldedDevices'));
    const updatedFoldedDevices = foldedDevices.includes(this.id)
      ? foldedDevices.filter((deviceId: string) => deviceId !== this.id)
      : [...foldedDevices, this.id];
    localStorage.setItem('foldedDevices', JSON.stringify(updatedFoldedDevices));
    this.isVisible = foldedDevices.includes(this.id);
  }
}
