import cloneDeep from 'lodash/cloneDeep';
import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import { JsonObject } from '@/stores/json-schema-editor';
import { formatError } from '@/utils/formatError';
import i18n from '~/i18n/react/config';
import { DeviceTypesStore } from '../device-types-store';
import { PortTabConfig, PortTabTcpConfig } from '../port-tab/types';
import { FwUpdateProxy, UpdateItem, SerialDeviceProxy, LoadConfigParams, LoadConfigResult } from '../types';
import { getIntAddress, toRpcPortConfig } from '../utils';
import { DeviceSettingsObjectStore } from './device-settings-editor/device-settings-store';
import { EmbeddedSoftware } from './embedded-software/embedded-software-store';
import { MatchingTemplatesStore } from './matching-templates/matching-templates-store';

export class DeviceTabStore {
  public type: string = 'device';
  public data: JsonObject;
  public deviceTypesStore: DeviceTypesStore;
  public deviceType: string;
  public hidden: boolean = false;
  public isLoading: boolean = true;
  public loadingMessage: string = '';
  public isDeprecated: boolean;
  public withSubdevices: boolean;
  public isUnknownType: boolean;
  public error: string = '';
  public slaveIdIsDuplicate: boolean = false;
  public isModbusDevice: boolean;
  public devicesWithTheSameId: string[] = [];
  public isDisconnected: boolean = false;
  public embeddedSoftware: EmbeddedSoftware;
  public waitingForDeviceReconnect: boolean = false;
  public schemaStore?: DeviceSettingsObjectStore;
  public matchingTemplatesStore: MatchingTemplatesStore;

  private _serialDeviceProxy: SerialDeviceProxy;
  private _fwUpdateProxy: FwUpdateProxy;

  constructor(
    data: JsonObject,
    deviceType: string,
    deviceTypesStore: DeviceTypesStore,
    fwUpdateProxy: FwUpdateProxy,
    serialDeviceProxy: SerialDeviceProxy
  ) {
    this.data = data;
    this.deviceTypesStore = deviceTypesStore;
    this.deviceType = deviceType;
    this.isDeprecated = deviceTypesStore.isDeprecated(deviceType);
    this.withSubdevices = deviceTypesStore.withSubdevices(deviceType);
    this.isUnknownType = deviceTypesStore.isUnknown(deviceType);
    this.isModbusDevice = deviceTypesStore.isModbusDevice(deviceType);
    this.devicesWithTheSameId = [];
    this.embeddedSoftware = new EmbeddedSoftware(fwUpdateProxy);
    this._serialDeviceProxy = serialDeviceProxy;
    this._fwUpdateProxy = fwUpdateProxy;
    this.matchingTemplatesStore = new MatchingTemplatesStore(deviceTypesStore);

    makeObservable(this, {
      name: computed,
      isDirty: computed,
      hasJsonValidationErrors: computed,
      hidden: observable,
      isDeprecated: observable,
      withSubdevices: observable,
      deviceType: observable,
      isLoading: observable,
      loadingMessage: observable,
      error: observable,
      slaveIdIsDuplicate: observable,
      devicesWithTheSameId: observable,
      isDisconnected: observable,
      waitingForDeviceReconnect: observable,
      editedData: computed,
      schemaStore: observable.ref,
      commitData: action,
      setDeviceType: action,
      loadContent: action,
      setSlaveIdIsDuplicate: action,
      setDevicesWithTheSameId: action,
      setDisconnected: action,
      setLoading: action,
      setUniqueMqttTopic: action,
      setError: action,
      setEmbeddedSoftwareUpdateProgress: action,
      hasInvalidConfig: computed,
      showDisconnectedError: computed,
      isWbDevice: computed,
    });
  }

  get editedData() {
    return this.schemaStore !== undefined ? this.schemaStore.value : this.data;
  }

  get isDirty() {
    return this.schemaStore !== undefined ? this.schemaStore.isDirty : false;
  }

  get hasJsonValidationErrors() {
    return this.schemaStore !== undefined ? this.schemaStore.hasErrors : false;
  }

  get name() {
    let deviceName = this.deviceTypesStore.getName(this.deviceType);
    if (!deviceName) {
      deviceName = i18n.t('device-manager.labels.unknown-device-type');
    }
    return `${this.slaveId || ''} ` + deviceName;
  }

  async loadConfigFromDevice(portConfig?: PortTabConfig) {
    if (portConfig) {
      this.setLoading(true, i18n.t('device-manager.labels.reading-parameters'));
      const params: LoadConfigParams = {
        slave_id: getIntAddress(this.slaveId),
        device_type: this.deviceType,
        modbus_mode: (portConfig as PortTabTcpConfig).modbusTcp ? 'TCP' : 'RTU',
        ...toRpcPortConfig(portConfig),
      };
      let configFromDevice: LoadConfigResult;
      try {
        configFromDevice = await this._serialDeviceProxy.LoadConfig(params);
      } catch (err) {
        if (!this.matchingTemplatesStore.findMatchingTemplatesFromException(err.data ?? '')) {
          this.setError(i18n.t('device-manager.errors.load-registers', {
            error: formatError(err),
            interpolation: { escapeValue: false },
          }));
        }
        return;
      }
      console.log('Config from device:', configFromDevice);
      this.matchingTemplatesStore.findMatchingTemplates(
        this.deviceType,
        configFromDevice.model,
        configFromDevice.fw
      );
      this.schemaStore?.setFromDeviceRegisters(configFromDevice.parameters, configFromDevice.fw);
    }
  }

  async setDeviceType(type: string, portConfig: PortTabConfig) {
    if (this.deviceType === type) {
      return;
    }
    this.setLoading(true, i18n.t('device-manager.labels.loading-template'));
    const oldSlaveId = this.slaveId;
    try {
      const schema = await this.deviceTypesStore.getSchema(type);
      runInAction(() => {
        this.schemaStore = new DeviceSettingsObjectStore(schema, {});
      });
      this.schemaStore?.setDefault();
    } catch (err) {
      const errorMsg = i18n.t('device-manager.errors.change-device-type', {
        error: formatError(err),
        interpolation: { escapeValue: false },
      });
      this.setError(errorMsg);
      this.setLoading(false);
      return;
    }
    runInAction(() => {
      this.deviceType = type;
      this.isDeprecated = this.deviceTypesStore.isDeprecated(this.deviceType);
      this.withSubdevices = this.deviceTypesStore.withSubdevices(this.deviceType);
      this.isModbusDevice = this.deviceTypesStore.isModbusDevice(this.deviceType);
      this.schemaStore?.setSlaveId(oldSlaveId);
      this.clearError();
    });
    await this.loadConfigFromDevice(portConfig);
    this.setLoading(false);
  }

  commitData() {
    if (this.schemaStore) {
      this.schemaStore.commit();
    }
  }

  getCopy() {
    let dataCopy = cloneDeep(this.editedData);
    dataCopy.slave_id = '';
    let tab = new DeviceTabStore(
      dataCopy,
      this.deviceType,
      this.deviceTypesStore,
      this._fwUpdateProxy,
      this._serialDeviceProxy
    );
    tab.loadContent();
    return tab;
  }

  async loadContent(portConfig?: PortTabConfig) {
    if (this.isUnknownType || this.withSubdevices || this.schemaStore !== undefined) {
      this.setLoading(false);
      return;
    }
    this.setLoading(true, i18n.t('device-manager.labels.loading-template'));
    try {
      const schema = await this.deviceTypesStore.getSchema(this.deviceType);
      runInAction(() => {
        this.schemaStore = new DeviceSettingsObjectStore(schema, this.data);
      });
      await this.loadConfigFromDevice(portConfig);
    } catch (err) {
      this.setError(err);
    }
    this.setLoading(false);
  }

  async setDefaultData() {
    this.setLoading(true, i18n.t('device-manager.labels.loading-template'));
    if (this.schemaStore === undefined) {
      const schema = await this.deviceTypesStore.getSchema(this.deviceType);
      runInAction(() => {
        this.schemaStore = new DeviceSettingsObjectStore(schema, this.data);
      });
    }
    if (this.schemaStore) {
      this.schemaStore.setDefault();
    }
    this.setLoading(false);
  }

  get hasInvalidConfig() {
    return (
      this.hasJsonValidationErrors || this.slaveIdIsDuplicate || this.devicesWithTheSameId.length
    );
  }

  get mqttId() {
    return (
      this.editedData.id ||
      this.deviceTypesStore.getDefaultId(this.deviceType, this.slaveId)
    );
  }

  get slaveId() {
    return this.editedData.slave_id === undefined || this.editedData.slave_id === ''
      ? undefined
      : this.editedData.slave_id as string;
  }

  get isWbDevice() {
    return this.deviceTypesStore.isWbDevice(this.deviceType);
  }

  setSlaveIdIsDuplicate(value: boolean) {
    this.slaveIdIsDuplicate = value;
  }

  setUniqueMqttTopic() {
    const idParam = this.schemaStore?.commonParams?.params?.['id'];
    if (idParam) {
      const oldId = idParam.value.hasError ?
        this.deviceTypesStore.getDefaultId(this.deviceType, this.slaveId) :
        idParam.value;
      idParam.setValue(oldId + '_2');
    }
  }

  setDevicesWithTheSameId(devices: string[]) {
    this.devicesWithTheSameId = devices;
  }

  setDisconnected(value: boolean) {
    if (value) {
      if (!this.embeddedSoftware.isUpdating) {
        this.embeddedSoftware.clearVersion();
      }
    } else {
      this.waitingForDeviceReconnect = false;
    }
    this.isDisconnected = value;
  }

  setLoading(value: boolean, message?: string) {
    this.isLoading = value;
    this.loadingMessage = message || '';
  }

  updateEmbeddedSoftwareVersion(portConfig: PortTabConfig) {
    if (this.isWbDevice) {
      this.embeddedSoftware.updateVersion(this.slaveId, portConfig);
    }
  }

  async startFirmwareUpdate(portConfig: PortTabConfig) {
    try {
      await this.embeddedSoftware.startFirmwareUpdate(this.slaveId, portConfig);
    } catch (err) {
      this.setError(err);
    }
  }

  async startBootloaderUpdate(portConfig: PortTabConfig) {
    try {
      await this.embeddedSoftware.startBootloaderUpdate(this.slaveId, portConfig);
    } catch (err) {
      this.setError(err);
    }
  }

  async startComponentsUpdate(portConfig: PortTabConfig) {
    try {
      await this.embeddedSoftware.startComponentsUpdate(this.slaveId, portConfig);
    } catch (err) {
      this.setError(err);
    }
  }

  setError(err: unknown) {
    this.error = formatError(err);
  }

  clearError() {
    this.setError('');
  }

  setEmbeddedSoftwareUpdateProgress(data: UpdateItem) {
    this.embeddedSoftware.setUpdateProgress(data);
    if (data?.progress === 100 || this.embeddedSoftware.hasComponentsError()) {
      this.waitingForDeviceReconnect = true;
      setTimeout(() => {
        runInAction(() => {
          this.waitingForDeviceReconnect = false;
        });
      }, 2000);
    }
  }

  get showDisconnectedError() {
    return (
      this.isDisconnected && !this.embeddedSoftware.isUpdating && !this.waitingForDeviceReconnect
    );
  }

  beforeDelete() {
    this.embeddedSoftware.clearError();
  }
}
