import cloneDeep from 'lodash/cloneDeep';
import every from 'lodash/every';
import intersection from 'lodash/intersection';
import isEqual from 'lodash/isEqual';
import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import i18n from '@/i18n/config';
import {
  getIntAddress,
  toSerialRpcPortConfig,
  toDmRpcPortConfig,
  setupDevice,
  DeviceSettingsObjectStore,
  EmbeddedSoftware,
  ReadRegistersState,
  ReadRegistersStateStore,
  type DeviceTypesStore,
} from '@/stores/device-manager';
import { type JsonObject } from '@/stores/json-schema-editor';
import { formatError } from '@/utils/format-error';
import type { PortTabConfig, PortTabSerialConfig, PortTabTcpConfig } from '../port-tab/types';
import type {
  FwUpdateProxy,
  UpdateItem,
  SerialDeviceProxy,
  LoadConfigParams,
  LoadConfigResult,
  SerialPortProxy,
  ScannedDevice,
  FwUpdateProxyRestoreParams,
} from '../types';

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
    fwUpdateProxy?: FwUpdateProxy,
    serialDeviceProxy?: SerialDeviceProxy,
    serialPortProxy?: SerialPortProxy,
  ) {
    this.initialData = initialData;
    this.deviceTypesStore = deviceTypesStore;
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
    const deviceName = this.editedData.name || this.deviceTypesStore.getName(this.deviceType)
      || i18n.t('device-manager.labels.unknown-device-type');
    return `${this.slaveId || ''} ${deviceName}`;
  }

  get isLoading() {
    return !!this.loadingMessage;
  }

  async _loadConfigFromDevice(portConfig?: PortTabConfig, isForce = false, previousData?: JsonObject) {
    if (![ReadRegistersState.WaitFirstRead, ReadRegistersState.Manual].includes(this.readRegistersState.state)
      && !isForce) {
      return;
    }
    this._setLoading(i18n.t('device-manager.labels.reading-parameters'));
    const params: LoadConfigParams = {
      slave_id: getIntAddress(this.slaveId),
      device_type: this.deviceType,
      modbus_mode: (portConfig as PortTabTcpConfig).modbusTcp ? 'TCP' : 'RTU',
      ...toSerialRpcPortConfig(portConfig),
      force: isForce,
    };
    let configFromDevice: LoadConfigResult;
    try {
      configFromDevice = await this._serialDeviceProxy.LoadConfig(params);
    } catch (err) {
      return this.readRegistersState.readError(err);
    }

    if (isForce && previousData) {
      const isEqualByCommonFields = (a: JsonObject, b: JsonObject)=> {
        const commonKeys = intersection(Object.keys(a), Object.keys(b));
        return every(commonKeys, (key: string) => isEqual(a[key], b[key]));
      };

      const isDirty = !isEqualByCommonFields(configFromDevice.parameters, previousData);
      if (isDirty && !confirm(i18n.t('device-manager.labels.uncommitted-settings'))) {
        return;
      }
    }

    this.readRegistersState.successfulRead(this.deviceType, configFromDevice.model, configFromDevice.fw);
    this.schemaStore?.setFromDeviceRegisters(configFromDevice.parameters, configFromDevice.fw, isForce);
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
      return this._clearLoading();
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
      this._serialPortProxy,
    );
    tab.loadContent();
    return tab;
  }

  async loadContent(portConfig?: PortTabConfig, isForce: boolean = false) {
    let previousData = { ...this.editedData };
    if (this.isUnknownType || this.withSubdevices) {
      return this._clearLoading();
    }
    try {
      if (!this.schemaStore || isForce) {
        this._setLoading(i18n.t('device-manager.labels.loading-template'));
        const schema = await this.deviceTypesStore.getSchema(this.deviceType);
        runInAction(() => this.schemaStore = new DeviceSettingsObjectStore(schema, this.initialData));
      }
      if (portConfig) {
        await this._loadConfigFromDevice(portConfig, isForce, previousData);
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
      runInAction(() => this.schemaStore = new DeviceSettingsObjectStore(schema, this.initialData));
    }
    if (this.schemaStore) {
      this.schemaStore.setDefault();
    }
    this._clearLoading();
  }

  get hasInvalidConfig() {
    return this.hasJsonValidationErrors || this.slaveIdIsDuplicate || this.devicesWithTheSameId.length;
  }

  get mqttId(): string {
    return this.editedData.id as string || this.deviceTypesStore.getDefaultId(this.deviceType, this.slaveId);
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
    const idParam = this.schemaStore?.commonParams?.params.find((item) => item.key === 'id');
    if (idParam) {
      const oldId = idParam.store.value ?? this.deviceTypesStore.getDefaultId(this.deviceType, this.slaveId);
      idParam.enable();
      idParam.store.setValue(oldId + '_2');
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
    // initialData.enabled could be undefined, which means that the device is enabled
    if (this.isWbDevice && this.initialData?.enabled !== false) {
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
        return await setupDevice(
          this._serialPortProxy,
          device,
          {
            slave_id: getIntAddress(this.slaveId),
            baud_rate: portConfig['baud-rate'],
            parity: (portConfig as PortTabSerialConfig).parity,
            stop_bits: (portConfig as PortTabSerialConfig).stopBits,
          });
      }

      let params: FwUpdateProxyRestoreParams = {
        slave_id: getIntAddress(device.address),
        port: toDmRpcPortConfig(portConfig),
      };
      if ((portConfig as PortTabTcpConfig).modbusTcp) {
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
    this.isUnknownType = this.deviceTypesStore.isUnknown(deviceType);
    this.isDeprecated = this.deviceTypesStore.isDeprecated(this.deviceType);
    this.withSubdevices = this.deviceTypesStore.withSubdevices(this.deviceType);
    this.isModbusDevice = this.deviceTypesStore.isModbusDevice(this.deviceType);
    this.isWbDevice = this.deviceTypesStore.isWbDevice(this.deviceType);
  }
}
