import cloneDeep from 'lodash/cloneDeep';
import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import { DeviceSettingsObjectStore, loadDeviceTemplate } from '@/stores/device-manager';
import { loadJsonSchema, Translator } from '@/stores/json-schema-editor';
import i18n from '../../../i18n/react/config';
import { firmwareIsNewerOrEqual } from '../../../utils/fwUtils';
import { getIntAddress } from '../common/modbusAddressesSet';
import { TabType } from './tabsStore';

export function toRpcPortConfig(portConfig) {
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
  hasUpdate = false;
  errorData = {};

  constructor(fwUpdateProxy, type) {
    this.type = type;
    this.fwUpdateProxy = fwUpdateProxy;
    makeObservable(this, {
      current: observable,
      available: observable,
      updateProgress: observable,
      errorData: observable.ref,
      hasUpdate: observable,
      isActual: computed,
      clearVersion: action,
      setUpdateProgress: action,
      startUpdate: action,
      setVersion: action,
      setupUpdate: action,
      resetUpdate: action,
    });
  }

  setVersion(current, available, hasUpdate) {
    this.current = current;
    this.available = available;
    this.hasUpdate = hasUpdate;
  }

  clearVersion() {
    this.current = '';
    this.available = '';
    this.hasUpdate = false;
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
    let params = {
      slave_id: getIntAddress(address),
      port: toRpcPortConfig(portConfig),
      type: this.type,
    };
    if (portConfig.modbusTcp) {
      params.protocol = 'modbus-tcp';
    }
    await this.fwUpdateProxy.Update(params);
  }

  setupUpdate() {
    this.updateProgress = 0;
    this.errorData = {};
  }

  resetUpdate() {
    this.updateProgress = null;
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
    } catch (err) { }
    runInAction(() => {
      this.errorData = {};
    });
  }
}

class ComponentFirmware extends EmbeddedSoftwareComponent {
  constructor(fwUpdateProxy, model) {
    super(fwUpdateProxy, 'component');
    this.model = model;
  }
}

export class EmbeddedSoftware {
  constructor(fwUpdateProxy) {
    this.fwUpdateProxy = fwUpdateProxy;
    this.firmware = new EmbeddedSoftwareComponent(fwUpdateProxy, 'firmware');
    this.bootloader = new EmbeddedSoftwareComponent(fwUpdateProxy, 'bootloader');
    this.components = new Map();
    this.canUpdate = false;
    this.deviceModel = '';

    makeObservable(this, {
      canUpdate: observable,
      deviceModel: observable,
      components: observable,
      setUpdateProgress: action,
      startFirmwareUpdate: action,
      isUpdating: computed,
      hasUpdate: computed,
      hasError: computed,
      hasComponentsUpdates: computed,
      componentsCanBeUpdated: computed,
    });
  }

  async updateVersion(address, portConfig) {
    try {
      if (await this.fwUpdateProxy.hasMethod('GetFirmwareInfo')) {
        let params = {
          slave_id: getIntAddress(address),
          port: toRpcPortConfig(portConfig),
        };
        if (portConfig.modbusTcp) {
          params.protocol = 'modbus-tcp';
        }
        let res = await this.fwUpdateProxy.GetFirmwareInfo(params);

        const newComponents = new Map();
        for (const [componentKey, componentData] of Object.entries(res.components || {})) {
          let component = new ComponentFirmware(this.fwUpdateProxy, componentData.model);
          component.setVersion(componentData.fw, componentData.available_fw, componentData.has_update);
          newComponents.set(parseInt(componentKey, 10), component);
        }

        runInAction(() => {
          this.canUpdate = res.can_update;
          this.deviceModel = res?.model || '';
          this.components = newComponents;
        });

        this.firmware.setVersion(res.fw, res.available_fw, res.fw_has_update);
        this.bootloader.setVersion(res.bootloader, res.available_bootloader, res.bootloader_has_update);
      }
    } catch (err) {
      this.clearVersion();
    }
  }

  setUpdateProgress(data) {
    if (data.type === 'bootloader') {
      this.bootloader.setUpdateProgress(data);
    } else if (data.type === 'firmware') {
      this.firmware.setUpdateProgress(data);
    } else if (data.type === 'component') {
      if (!this.components.has(data.component_number)) {
        runInAction(() => {
          this.components.set(data.component_number, new ComponentFirmware(this.fwUpdateProxy, data.component_model));
        });
      }
      this.components.get(data.component_number).setUpdateProgress(data);
    }
  }

  clearComponentsVersion() {
    for (const component of this.components.values()) {
      component.clearVersion();
    }
  }

  clearComponentsError() {
    for (const component of this.components.values()) {
      component.clearError();
    }
  }

  hasComponentsError() {
    return [...this.components.values()].some((c) => c.hasError);
  }

  setupComponentsUpdate(components) {
    for (const component of components.values()) {
      component.setupUpdate();
    }
  }

  resetComponentsUpdate(components) {
    for (const component of components.values()) {
      component.resetUpdate();
    }
  }

  async startFirmwareUpdate(address, portConfig) {
    const componentsCanBeUpdated = this.componentsCanBeUpdated;

    try {
      this.firmware.setupUpdate();
      this.setupComponentsUpdate(componentsCanBeUpdated);
      await this.firmware.startUpdate(address, portConfig, componentsCanBeUpdated);
    } catch (err) {
      this.firmware.resetUpdate();
      this.resetComponentsUpdate(componentsCanBeUpdated);
      throw err;
    }
    this.clearComponentsVersion();
  }

  async startBootloaderUpdate(address, portConfig) {
    const componentsCanBeUpdated = this.componentsCanBeUpdated;

    try {
      this.bootloader.setupUpdate();
      this.firmware.setupUpdate();
      this.setupComponentsUpdate(componentsCanBeUpdated);
      await this.bootloader.startUpdate(address, portConfig, componentsCanBeUpdated);
    } catch (err) {
      this.bootloader.resetUpdate();
      this.firmware.resetUpdate();
      this.resetComponentsUpdate(componentsCanBeUpdated);
      throw err;
    }
    this.firmware.clearVersion();
    this.clearComponentsVersion();
  }

  async startComponentsUpdate(address, portConfig) {
    const componentsCanBeUpdated = this.componentsCanBeUpdated;

    try {
      this.setupComponentsUpdate(componentsCanBeUpdated);
      const firstComponent = componentsCanBeUpdated.get(0);
      // Triggering update for the first component with components list causes all components update
      await firstComponent.startUpdate(address, portConfig, componentsCanBeUpdated);
    } catch (err) {
      this.resetComponentsUpdate(componentsCanBeUpdated);
      throw err;
    }
  }

  clearVersion() {
    this.firmware.clearVersion();
    this.bootloader.clearVersion();
    this.clearComponentsVersion();
  }

  clearError() {
    this.firmware.clearError();
    this.bootloader.clearError();
    this.clearComponentsError();
  }

  get isUpdating() {
    return this.firmware.isUpdating || this.bootloader.isUpdating || [...this.components.values()].some((c) => c.isUpdating);
  }

  get hasUpdate() {
    return this.firmware.hasUpdate || this.hasComponentsUpdates;
  }

  get hasComponentsUpdates() {
    return this.componentsCanBeUpdated.size > 0;
  }

  get componentsCanBeUpdated() {
    return new Map([...this.components].filter(([, component]) => component.hasUpdate));
  }

  get hasError() {
    return this.firmware.hasError || this.bootloader.hasError || [...this.components.values()].some((c) => c.hasError);
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
    this.withSubdevices = deviceTypesStore.withSubdevices(deviceType);
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
      withSubdevices: observable,
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
      this.withSubdevices = this.deviceTypesStore.withSubdevices(this.deviceType);
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
    if (this.isUnknownType || this.withSubdevices || this.schemaStore !== undefined) {
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
    if (this.isWbDevice) {
      this.embeddedSoftware.updateVersion(this.slaveId, portConfig);
    }
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

  async startComponentsUpdate(portConfig) {
    try {
      await this.embeddedSoftware.startComponentsUpdate(this.slaveId, portConfig);
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
