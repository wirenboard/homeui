import cloneDeep from 'lodash/cloneDeep';
import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import { JsonObject } from '@/stores/json-schema-editor';
import { formatError } from '@/utils/formatError';
import i18n from '~/i18n/react/config';
import { DeviceTypesStore } from '../device-types-store';
import type { PortTabConfig, PortTabTcpConfig } from '../port-tab/types';
import type {
  FwUpdateProxy,
  UpdateItem,
  SerialDeviceProxy,
  LoadConfigParams,
  LoadConfigResult,
  SerialPortProxy,
  ScannedDevice,
  FwUpdateProxyRestoreParams
} from '../types';
import { getIntAddress, toSerialRpcPortConfig, toDmRpcPortConfig, setupDevice } from '../utils';
import { DeviceSettingsObjectStore } from './device-settings-editor/device-settings-store';
import { EmbeddedSoftware } from './embedded-software/embedded-software-store';
import { ReadRegistersStateStore } from './read-registers-state';
import { ReadRegistersState } from './types';

export class DeviceTabStore {
  public type: string = 'device';
  public initialData: JsonObject;
  public deviceTypesStore: DeviceTypesStore;
  public deviceType: string;
  public hidden: boolean = false;
  public loadingMessage: string = '';
  public isDeprecated: boolean;
  public withSubdevices: boolean;
  public isUnknownType: boolean;
  public isWbDevice: boolean;
  public error: string = '';
  public slaveIdIsDuplicate: boolean = false;
  public isModbusDevice: boolean;
  public devicesWithTheSameId: string[] = [];
  public isDisconnected: boolean = false;
  public embeddedSoftware: EmbeddedSoftware;
  public schemaStore?: DeviceSettingsObjectStore;
  public readRegistersState: ReadRegistersStateStore;

  private _serialDeviceProxy: SerialDeviceProxy;
  private _fwUpdateProxy: FwUpdateProxy;
  private _serialPortProxy: SerialPortProxy;

  constructor(
    initialData: JsonObject,
    deviceType: string,
    deviceTypesStore: DeviceTypesStore,
    fwUpdateProxy: FwUpdateProxy,
    serialDeviceProxy: SerialDeviceProxy,
    serialPortProxy: SerialPortProxy
  ) {
    this.initialData = initialData;
    this.deviceTypesStore = deviceTypesStore;
    this.devicesWithTheSameId = [];
    this.embeddedSoftware = new EmbeddedSoftware(fwUpdateProxy);
    this._serialDeviceProxy = serialDeviceProxy;
    this._fwUpdateProxy = fwUpdateProxy;
    this._serialPortProxy = serialPortProxy;
    this.readRegistersState = new ReadRegistersStateStore(deviceTypesStore, initialData, deviceType);
    this._initFromDeviceType(deviceType);

    makeObservable(this, {
      name: computed,
      isDirty: computed,
      hasJsonValidationErrors: computed,
      hidden: observable,
      isDeprecated: observable,
      withSubdevices: observable,
      deviceType: observable,
      loadingMessage: observable,
      error: observable,
      slaveIdIsDuplicate: observable,
      devicesWithTheSameId: observable,
      isDisconnected: observable,
      readRegistersState: observable,
      isWbDevice: observable,
      editedData: computed,
      schemaStore: observable.ref,
      isLoading: computed,
      commitData: action,
      setDeviceType: action,
      loadContent: action,
      setSlaveIdIsDuplicate: action,
      setDevicesWithTheSameId: action,
      setDisconnected: action,
      _setLoading: action,
      setUniqueMqttTopic: action,
      _setError: action,
      setEmbeddedSoftwareUpdateProgress: action,
      _initFromDeviceType: action,
      hasInvalidConfig: computed,
      showDisconnectedError: computed,
    });
  }

  get editedData() {
    return this.schemaStore !== undefined ? this.schemaStore.value : this.initialData;
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

  get isLoading() {
    return !!this.loadingMessage;
  }

  async _loadConfigFromDevice(portConfig?: PortTabConfig) {
    if (![ReadRegistersState.WaitFirstRead, ReadRegistersState.Manual].includes(this.readRegistersState.state)) {
      return;
    }
    this._setLoading(i18n.t('device-manager.labels.reading-parameters'));
    const params: LoadConfigParams = {
      slave_id: getIntAddress(this.slaveId),
      device_type: this.deviceType,
      modbus_mode: (portConfig as PortTabTcpConfig).modbusTcp ? 'TCP' : 'RTU',
      ...toSerialRpcPortConfig(portConfig),
    };
    let configFromDevice: LoadConfigResult;
    try {
      configFromDevice = await this._serialDeviceProxy.LoadConfig(params);
    } catch (err) {
      this.readRegistersState.readError(err);
      return;
    }
    this.readRegistersState.successfulRead(
      this.deviceType,
      configFromDevice.model,
      configFromDevice.fw
    );
    this.schemaStore?.setFromDeviceRegisters(configFromDevice.parameters, configFromDevice.fw);
  }

  async setDeviceType(type: string, portConfig: PortTabConfig) {
    if (this.deviceType === type) {
      return;
    }
    this._setLoading(i18n.t('device-manager.labels.loading-template'));
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
      this._setError(errorMsg);
      this._clearLoading();
      return;
    }
    this._initFromDeviceType(type);
    this.schemaStore?.setSlaveId(oldSlaveId);
    this.readRegistersState.deviceTypeChanged(type, this.slaveId ?? '', !!(this.editedData?.enabled ?? true));
    this._clearError();
    await this._loadConfigFromDevice(portConfig);
    this._clearLoading();
  }

  commitData() {
    if (this.schemaStore) {
      this.schemaStore.commit();
      this.initialData = cloneDeep(this.editedData);
    }
    this.isDisconnected = false;
  }

  getCopy() {
    let dataCopy = cloneDeep(this.editedData);
    delete dataCopy.slave_id;
    let tab = new DeviceTabStore(
      dataCopy,
      this.deviceType,
      this.deviceTypesStore,
      this._fwUpdateProxy,
      this._serialDeviceProxy,
      this._serialPortProxy
    );
    tab.loadContent();
    return tab;
  }

  async loadContent(portConfig?: PortTabConfig) {
    if (this.isUnknownType || this.withSubdevices) {
      this._clearLoading();
      return;
    }
    try {
      if (!this.schemaStore) {
        this._setLoading(i18n.t('device-manager.labels.loading-template'));
        const schema = await this.deviceTypesStore.getSchema(this.deviceType);
        runInAction(() => {
          this.schemaStore = new DeviceSettingsObjectStore(schema, this.initialData);
        });
      }
      if (portConfig) {
        await this._loadConfigFromDevice(portConfig);
      }
    } catch (err) {
      this._setError(err);
    }
    this._clearLoading();
  }

  async setDefaultData() {
    this._setLoading(i18n.t('device-manager.labels.loading-template'));
    if (this.schemaStore === undefined) {
      const schema = await this.deviceTypesStore.getSchema(this.deviceType);
      runInAction(() => {
        this.schemaStore = new DeviceSettingsObjectStore(schema, this.initialData);
      });
    }
    if (this.schemaStore) {
      this.schemaStore.setDefault();
    }
    this._clearLoading();
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

  setDisconnected(value: boolean, portConfig: PortTabConfig) {
    if (value) {
      if (!this.embeddedSoftware.isUpdating) {
        this.embeddedSoftware.clearVersion();
      }
    } else {
      this.updateEmbeddedSoftwareVersion(portConfig);
      if (this.isDisconnected !== value) {
        this.readRegistersState.deviceConnected();
      }
    }
    this.isDisconnected = value;
  }

  _setLoading(message: string) {
    this.loadingMessage = message;
  }

  _clearLoading() {
    this._setLoading('');
  }

  updateEmbeddedSoftwareVersion(portConfig: PortTabConfig) {
    if (this.isWbDevice) {
      this.embeddedSoftware.updateVersion(this.slaveId, portConfig);
    }
  }

  async startFirmwareUpdate(portConfig: PortTabConfig) {
    try {
      this._clearError();
      await this.embeddedSoftware.startFirmwareUpdate(this.slaveId, portConfig);
    } catch (err) {
      this._setError(err);
    }
  }

  async startBootloaderUpdate(portConfig: PortTabConfig) {
    try {
      this._clearError();
      await this.embeddedSoftware.startBootloaderUpdate(this.slaveId, portConfig);
    } catch (err) {
      this._setError(err);
    }
  }

  async startComponentsUpdate(portConfig: PortTabConfig) {
    try {
      this._clearError();
      await this.embeddedSoftware.startComponentsUpdate(this.slaveId, portConfig);
    } catch (err) {
      this._setError(err);
    }
  }

  _setError(err: unknown) {
    this.error = formatError(err);
  }

  _clearError() {
    this._setError('');
  }

  setEmbeddedSoftwareUpdateProgress(data: UpdateItem, portConfig: PortTabConfig) {
    this.embeddedSoftware.setUpdateProgress(data);
    if (data?.progress === 100 && data?.type === 'firmware') {
      this._setLoading(i18n.t('device-manager.labels.reading-parameters'));
      setTimeout(() => {
        this.readRegistersState.firmwareUpdated();
        this.loadContent(portConfig);
      }, 2000);
    }
  }

  get showDisconnectedError() {
    return !this.isLoading && this.isDisconnected && !this.embeddedSoftware.isUpdating;
  }

  beforeDelete() {
    this.embeddedSoftware.clearError();
  }

  async restoreDisconnectedDevice(device: ScannedDevice, portConfig: PortTabConfig) {
    try {
      this._setLoading(i18n.t('device-manager.labels.restoring-device'));
      if (!device.bootloaderMode) {
        await setupDevice(
          this._serialPortProxy,
          device,
          {
            slave_id: getIntAddress(this.slaveId),
            baud_rate: portConfig['baud-rate'],
            parity: portConfig.parity,
            stop_bits: portConfig.stopBits,
          });
        return;
      }

      let params: FwUpdateProxyRestoreParams = {
        slave_id: getIntAddress(device.address),
        port: toDmRpcPortConfig(portConfig),
      };
      if (portConfig.modbusTcp) {
        params.protocol = 'modbus-tcp';
      }
      await this._fwUpdateProxy.Restore(params);
      await this.setDisconnected(false, portConfig);
    } catch (err) {
      this._setError(err);
    }
    this._clearLoading();
  }

  _initFromDeviceType(deviceType: string) {
    this.deviceType = deviceType;
    this.isDeprecated = this.deviceTypesStore.isDeprecated(this.deviceType);
    this.withSubdevices = this.deviceTypesStore.withSubdevices(this.deviceType);
    this.isModbusDevice = this.deviceTypesStore.isModbusDevice(this.deviceType);
    this.isWbDevice = this.deviceTypesStore.isWbDevice(this.deviceType);
  }
}
