import { makeAutoObservable } from 'mobx';
import { DeviceTypesStore } from '../../device-types-store';

export class MatchingTemplatesStore {
  public message: string = '';
  public templateFw: string = '';
  public deviceModel: string = '';
  public deviceFw: string = '';
  public matchingTemplates: string[] = [];
  public allowEditSettings: boolean = true;

  private _deviceTypesStore: DeviceTypesStore;

  constructor(deviceTypesStore: DeviceTypesStore) {
    this._deviceTypesStore = deviceTypesStore;
    makeAutoObservable(this);
  }

  findMatchingTemplatesFromException(errorMessage: string) {
    const errors: Array<[RegExp, string]> = [
      [
        /Device "(.+?)" firmware version (.+?) is lower than selected template minimal supported version (.+?)$/,
        'device-manager.errors.fw-mismatch',
      ],
      [
        /Device "(.+?)" with firmware version (.+?) is incompatible with selected template device models/,
        'device-manager.errors.model-mismatch',
      ],
    ];
    for (const [regex, message] of errors) {
      const match = errorMessage.match(regex);
      if (match) {
        this.message = message;
        this.deviceModel = match[1];
        this.deviceFw = match[2];
        this.templateFw = match[3] ?? '';
        this.matchingTemplates = this._deviceTypesStore.findNotDeprecatedDeviceTypes(
          this.deviceModel,
          this.deviceFw
        );
        this.allowEditSettings = false;
        return true;
      }
    }
    this.clear();
    return false;
  }

  findMatchingTemplates(selectedDeviceType: string, deviceModel: string, deviceFw: string) {
    const matchingTemplates = this._deviceTypesStore.findNotDeprecatedDeviceTypes(
      deviceModel,
      deviceFw
    );
    if (matchingTemplates.length && !matchingTemplates.includes(selectedDeviceType)) {
      // selectedDeviceType is old and a better new template is available
      this.message = 'device-manager.labels.better-template';
      this.deviceModel = deviceModel;
      this.deviceFw = deviceFw;
      this.templateFw = '';
      this.matchingTemplates = matchingTemplates;
      this.allowEditSettings = true;
    } else {
      this.clear();
    }
  }

  clear() {
    this.message = '';
    this.templateFw = '';
    this.deviceModel = '';
    this.deviceFw = '';
    this.matchingTemplates = [];
    this.allowEditSettings = true;
  }
}
