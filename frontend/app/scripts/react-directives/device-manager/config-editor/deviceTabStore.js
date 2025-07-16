import cloneDeep from 'lodash/cloneDeep';
import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import { DeviceSettingsObjectStore, loadDeviceTemplate } from '@/stores/device-manager';
import { loadJsonSchema, Translator } from '@/stores/json-schema-editor';
import i18n from '../../../i18n/react/config';
import { firmwareIsNewer, firmwareIsNewerOrEqual } from '../../../utils/fwUtils';
import { getIntAddress } from '../common/modbusAddressesSet';
import { TabType } from './tabsStore';

function toRpcPortConfig(portConfig) {
  if (Object.hasOwn(portConfig, 'address')) {
    return {
      address: portConfig.address,
      port: portConfig.port,
    };
  }
  return {
    path: portConfig.path,
    baud_rate: portConfig.baudRate,
    parity: portConfig.parity,
    stop_bits: portConfig.stopBits,
  };
}

export class EmbeddedSoftwareComponent {
  current = '';
  available = '';
  fwUpdateProxy;
  updateProgress = null;
  errorData = {};

  constructor(fwUpdateProxy, type) {
    this.type = type;
    this.fwUpdateProxy = fwUpdateProxy;
    makeObservable(this, {
      current: observable,
      available: observable,
      updateProgress: observable,
      errorData: observable.ref,
      hasUpdate: computed,
      isActual: computed,
      clearVersion: action,
      setUpdateProgress: action,
      startUpdate: action,
      setVersion: action,
    });
  }

  setVersion(current, available) {
    this.current = current;
    this.available = available;
  }

  clearVersion() {
    this.current = '';
    this.available = '';
  }

  get hasUpdate() {
    if (this.current === '' || this.available === '') {
      return false;
    }
    return firmwareIsNewer(this.current, this.available);
  }

  get isActual() {
    return this.available !== '' && this.current === this.available;
  }

  setUpdateProgress(data) {
    this.updateProgress = data.progress;
    this.current = data.from_version;
    this.available = data.to_version;
    this.errorData = data;
    if ((this.hasError && this.isUpdating) || this.updateProgress === 100) {
      this.updateProgress = null;
      this.clearVersion();
    }
  }

  get isUpdating() {
    return this.updateProgress !== null;
  }

  async startUpdate(address, portConfig) {
    this.updateProgress = 0;
    this.errorData = {};
    try {
      await this.fwUpdateProxy.Update({
        slave_id: getIntAddress(address),
        port: toRpcPortConfig(portConfig),
        type: this.type,
      });
    } catch (err) {
      this.updateProgress = null;
      throw err;
    }
  }

  get hasError() {
    return !!this.errorData.error?.message;
  }

  async clearError() {
    if (!this.hasError) {
      return;
    }
    try {
      await this.fwUpdateProxy.ClearError({
        slave_id: this.errorData.slave_id,
        port: this.errorData.port,
        type: this.type,
      });
    } catch (err) {}
    runInAction(() => {
      this.errorData = {};
    });
  }
}

export class EmbeddedSoftware {
  constructor(fwUpdateProxy) {
    this.fwUpdateProxy = fwUpdateProxy;
    this.firmware = new EmbeddedSoftwareComponent(fwUpdateProxy, 'firmware');
    this.bootloader = new EmbeddedSoftwareComponent(fwUpdateProxy, 'bootloader');
    this.canUpdate = false;
    this.deviceModel = '';

    makeObservable(this, {
      canUpdate: observable,
      deviceModel: observable,
      setUpdateProgress: action,
      startFirmwareUpdate: action,
      isUpdating: computed,
      hasUpdate: computed,
      hasError: computed,
    });
  }

  async updateVersion(address, portConfig) {
    try {
      if (await this.fwUpdateProxy.hasMethod('GetFirmwareInfo')) {
        let res = await this.fwUpdateProxy.GetFirmwareInfo({
          slave_id: getIntAddress(address),
          port: toRpcPortConfig(portConfig),
        });
        runInAction(() => {
          this.canUpdate = res.can_update;
          this.deviceModel = res?.model || '';
        });
        this.firmware.setVersion(res.fw, res.available_fw);
        this.bootloader.setVersion(res.bootloader, res.available_bootloader);
      }
    } catch (err) {
      this.clearVersion();
    }
  }

  setUpdateProgress(data) {
    if (data.type === 'bootloader') {
      this.bootloader.setUpdateProgress(data);
    } else {
      this.firmware.setUpdateProgress(data);
    }
  }

  async startFirmwareUpdate(address, portConfig) {
    await this.firmware.startUpdate(address, portConfig);
  }

  async startBootloaderUpdate(address, portConfig) {
    await this.bootloader.startUpdate(address, portConfig);
    this.firmware.clearVersion();
  }

  clearVersion() {
    this.firmware.clearVersion();
    this.bootloader.clearVersion();
  }

  clearError() {
    this.firmware.clearError();
    this.bootloader.clearError();
  }

  get isUpdating() {
    return this.firmware.isUpdating || this.bootloader.isUpdating;
  }

  get hasUpdate() {
    return this.firmware.hasUpdate;
  }

  get hasError() {
    return this.firmware.hasError || this.bootloader.hasError;
  }

  get bootloaderCanSaveSettings() {
    return firmwareIsNewerOrEqual('1.2.0', this.bootloader.current);
  }
}

export class DeviceTab {
  constructor(data, deviceType, deviceTypesStore, fwUpdateProxy) {
    this.type = TabType.DEVICE;
    this.data = data;
    this.deviceTypesStore = deviceTypesStore;
    this.deviceType = deviceType;
    this.hidden = false;
    this.loading = true;
    this.isDeprecated = deviceTypesStore.isDeprecated(deviceType);
    this.isUnknownType = deviceTypesStore.isUnknown(deviceType);
    this.error = '';
    this.slaveIdIsDuplicate = false;
    this.isModbusDevice = deviceTypesStore.isModbusDevice(deviceType);
    this.devicesWithTheSameId = [];
    this.isDisconnected = false;
    this.embeddedSoftware = new EmbeddedSoftware(fwUpdateProxy);
    this.waitingForDeviceReconnect = false;
    this.schemaStore = undefined;
    this.schemaTranslator = undefined;

    makeObservable(this, {
      name: computed,
      isDirty: computed,
      hasJsonValidationErrors: computed,
      hidden: observable,
      isDeprecated: observable,
      deviceType: observable,
      loading: observable,
      error: observable,
      slaveIdIsDuplicate: observable,
      devicesWithTheSameId: observable,
      isDisconnected: observable,
      waitingForDeviceReconnect: observable,
      editedData: computed,
      schemaStore: observable.ref,
      commitData: action,
      setDeviceType: action,
      loadSchema: action,
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

  async setDeviceType(type) {
    if (this.deviceType === type) {
      return;
    }
    this.loading = true;
    const oldSlaveId = this.slaveId;
    try {
      const schema = await this.deviceTypesStore.getSchema(type);
      const jsonSchema = loadJsonSchema(schema);
      const deviceTemplate = loadDeviceTemplate(schema);
      this.schemaTranslator = new Translator();
      this.schemaTranslator.addTranslations(jsonSchema.translations);
      this.schemaTranslator.addTranslations(deviceTemplate.translations);
      runInAction(() => {
        this.schemaStore = new DeviceSettingsObjectStore(jsonSchema, deviceTemplate, {});
      });
      this.schemaStore.setDefault();
    } catch (err) {
      const errorMsg = i18n.t('device-manager.errors.change-device-type', {
        error: err.message,
        interpolation: { escapeValue: false },
      });
      this.setError(errorMsg);
      this.setLoading(false);
      return;
    }
    runInAction(() => {
      this.deviceType = type;
      this.isDeprecated = this.deviceTypesStore.isDeprecated(this.deviceType);
      this.isModbusDevice = this.deviceTypesStore.isModbusDevice(this.deviceType);
      this.schemaStore.setSlaveId(oldSlaveId);
      this.clearError();
      this.loading = false;
    });
  }

  commitData() {
    if (this.schemaStore) {
      this.schemaStore.commit();
    }
  }

  getCopy() {
    let dataCopy = cloneDeep(this.editedData);
    dataCopy.slave_id = '';
    let tab = new DeviceTab(dataCopy, this.deviceType, this.deviceTypesStore);
    tab.loadSchema();
    return tab;
  }

  async loadSchema() {
    if (this.isUnknownType || this.schemaStore !== undefined) {
      this.loading = false;
      return;
    }
    this.loading = true;
    try {
      const schema = await this.deviceTypesStore.getSchema(this.deviceType);
      const jsonSchema = loadJsonSchema(schema);
      const deviceTemplate = loadDeviceTemplate(schema);
      this.schemaTranslator = new Translator();
      this.schemaTranslator.addTranslations(jsonSchema.translations);
      this.schemaTranslator.addTranslations(deviceTemplate.translations);
      runInAction(() => {
        this.schemaStore = new DeviceSettingsObjectStore(jsonSchema, deviceTemplate, this.data);
      });
    } catch (err) {
      this.setError(err.message);
    }
    runInAction(() => {
      this.isDeprecated = this.deviceTypesStore.isDeprecated(this.deviceType);
      this.loading = false;
    });
  }

  async setDefaultData() {
    this.loading = true;
    if (this.schemaStore === undefined) {
      const schema = await this.deviceTypesStore.getSchema(this.deviceType);
      const jsonSchema = loadJsonSchema(schema);
      const deviceTemplate = loadDeviceTemplate(schema);
      this.schemaTranslator = new Translator();
      this.schemaTranslator.addTranslations(jsonSchema.translations);
      this.schemaTranslator.addTranslations(deviceTemplate.translations);
      runInAction(() => {
        this.schemaStore = new DeviceSettingsObjectStore(jsonSchema, deviceTemplate, this.data);
      });
    }
    if (this.schemaStore) {
      this.schemaStore.setDefault();
    }
    runInAction(() => {
      this.loading = false;
    });
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
      : this.editedData.slave_id;
  }

  get isWbDevice() {
    return this.deviceTypesStore.isWbDevice(this.deviceType);
  }

  setSlaveIdIsDuplicate(value) {
    this.slaveIdIsDuplicate = value;
  }

  setUniqueMqttTopic() {
    const idParam = this.schemaStore?.params?.['id'];
    if (idParam) {
      const oldId = idParam.value.hasError ?
        this.deviceTypesStore.getDefaultId(this.deviceType, this.slaveId) :
        idParam.value;
      idParam.setValue(oldId + '_2');
    }
  }

  setDevicesWithTheSameId(devices) {
    this.devicesWithTheSameId = devices;
  }

  setDisconnected(value) {
    if (value) {
      if (!this.embeddedSoftware.isUpdating) {
        this.embeddedSoftware.clearVersion();
      }
    } else {
      this.waitingForDeviceReconnect = false;
    }
    this.isDisconnected = value;
  }

  setLoading(value) {
    this.loading = value;
  }

  updateEmbeddedSoftwareVersion(portConfig) {
    this.embeddedSoftware.updateVersion(this.slaveId, portConfig);
  }

  async startFirmwareUpdate(portConfig) {
    try {
      await this.embeddedSoftware.startFirmwareUpdate(this.slaveId, portConfig);
    } catch (err) {
      this.setError(err.message);
    }
  }

  async startBootloaderUpdate(portConfig) {
    try {
      await this.embeddedSoftware.startBootloaderUpdate(this.slaveId, portConfig);
    } catch (err) {
      this.setError(err.message);
    }
  }

  setError(err) {
    this.error = err;
  }

  clearError() {
    this.setError('');
  }

  setEmbeddedSoftwareUpdateProgress(data) {
    this.embeddedSoftware.setUpdateProgress(data);
    if (data?.progress === 100) {
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
