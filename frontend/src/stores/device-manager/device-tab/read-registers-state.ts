import { makeAutoObservable } from 'mobx';
import { JsonObject } from '@/stores/json-schema-editor';
import { formatError } from '@/utils/formatError';
import i18n from '~/i18n/react/config';
import { DeviceTypesStore } from '../device-types-store';
import { ReadRegistersState } from './types';

export class ReadRegistersStateStore {
  public errorMessage: string = '';
  public otherMatchingTemplates: string[] = [];
  public allowEditSettings: boolean = true;
  public state: ReadRegistersState = ReadRegistersState.Unsupported;

  private _deviceTypesStore: DeviceTypesStore;

  constructor(deviceTypesStore: DeviceTypesStore, initialDeviceConfig: JsonObject, deviceType: string) {
    this._deviceTypesStore = deviceTypesStore;
    if (this._deviceTypesStore.isWbDevice(deviceType) &&
        !this._deviceTypesStore.withSubdevices(deviceType) &&
        initialDeviceConfig.slave_id !== undefined &&
        (!Object.hasOwn(initialDeviceConfig, 'enabled') || initialDeviceConfig.enabled)) {
      this.state = ReadRegistersState.WaitFirstRead;
    }
    makeAutoObservable(this);
  }

  readError(error: unknown) {
    this.state = ReadRegistersState.Error;
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
    const errorMessage = String((error as Record<string, unknown>).data ?? '');
    for (const [regex, message] of errors) {
      const match = errorMessage.match(regex);
      if (match) {
        const deviceModel = match[1];
        const deviceFw = match[2];
        const templateFw = match[3] ?? '';
        this.errorMessage = i18n.t(message, {
          currentFw: deviceFw,
          requiredFw: templateFw,
          deviceModel: deviceModel,
        });
        this.otherMatchingTemplates = this._deviceTypesStore.findNotDeprecatedDeviceTypes(deviceModel, deviceFw);
        this.allowEditSettings = false;
        return;
      }
    }
    this.errorMessage = i18n.t('device-manager.errors.load-registers', {
      error: formatError(error),
      interpolation: { escapeValue: false },
    });
    this.otherMatchingTemplates = [];
    this.allowEditSettings = true;
  }

  successfulRead(deviceType: string, deviceModel: string, deviceFw: string) {
    this.state = ReadRegistersState.Complete;
    const matchingTemplates = this._deviceTypesStore.findNotDeprecatedDeviceTypes(
      deviceModel,
      deviceFw
    );
    this.allowEditSettings = true;
    this.otherMatchingTemplates = matchingTemplates.filter((dt) => dt !== deviceType);
    if (this.otherMatchingTemplates.length) {
      // selectedDeviceType is old and a better new template is available
      this.errorMessage = i18n.t('device-manager.labels.better-template');
    } else {
      this.errorMessage = '';
    }
  }

  deviceTypeChanged(deviceType: string, slaveId: string, enabled: boolean) {
    if (this._deviceTypesStore.isWbDevice(deviceType)) {
      this.state = (slaveId && enabled) ? ReadRegistersState.WaitFirstRead : ReadRegistersState.Disabled;
    } else {
      this.state = ReadRegistersState.Unsupported;
    }
    this.errorMessage = '';
    this.otherMatchingTemplates = [];
    this.allowEditSettings = true;
  }

  deviceConnected() {
    if ([ReadRegistersState.Error, ReadRegistersState.Disabled].includes(this.state)) {
      this.state = ReadRegistersState.Manual;
      this.errorMessage = '';
      this.otherMatchingTemplates = [];
      this.allowEditSettings = true;
    }
  }

  firmwareUpdated() {
    this.state = ReadRegistersState.WaitFirstRead;
    this.errorMessage = '';
    this.otherMatchingTemplates = [];
    this.allowEditSettings = true;
  }
}
