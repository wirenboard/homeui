import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import i18n from '../../../i18n/react/config';
import { firmwareIsNewer, firmwareIsNewerOrEqual } from '../../../utils/fwUtils';
import { getIntAddress } from '../common/modbusAddressesSet';
import { getDefaultObject } from './jsonSchemaUtils';
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

  async startUpdate(address, portConfig, components) {
    await this.fwUpdateProxy.Update({
      slave_id: getIntAddress(address),
      port: toRpcPortConfig(portConfig),
      type: this.type,
      components_numbers: [...components.keys()]
    });
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
    makeObservable(this, {
      setupUpdate: action,
    });
  }

  get hasUpdate() {
    
    if (this.current === '' || this.available === '') {
      return false;
    }
    return this.available !== this.current;
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
      componentsCanBeUpdated: computed
    });
  }

  async updateVersion(address, portConfig) {
    try {
      if (await this.fwUpdateProxy.hasMethod('GetFirmwareInfo')) {
        let res = await this.fwUpdateProxy.GetFirmwareInfo({
          slave_id: getIntAddress(address),
          port: toRpcPortConfig(portConfig),
        });

        const newComponents = new Map();
        for (const [componentKey, componentData] of Object.entries(res.components || {})) {
          let component = new ComponentFirmware(this.fwUpdateProxy, componentData.model);
          component.setVersion(componentData.fw, componentData.available_fw);
          newComponents.set(parseInt(componentKey, 10), component);
        }

        runInAction(() => {
          this.canUpdate = res.can_update;
          this.deviceModel = res?.model || '';
          this.components = newComponents;
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

    try{
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
    const componentsCanBeUpdated = this.componentsCanBeUpdated

    try{
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
    if (this.firmware.isUpdating || this.bootloader.isUpdating) {
      return true;
    }
    for (const component of this.components.values()) {
      if (component.isUpdating) {
        return true;
      }
    }
    return false;
  }

  get hasUpdate() {
    if (this.firmware.hasUpdate) {
      return true;
    }
    return this.hasComponentsUpdates;
  }

  get hasComponentsUpdates() {
    return this.componentsCanBeUpdated.size > 0;
  }

  get componentsCanBeUpdated() {
    return new Map([...this.components].filter(([, component]) => component.hasUpdate));
  }

  get hasError() {
    if (this.firmware.hasError || this.bootloader.hasError) {
      return true;
    }
    for (const component of this.components.values()) {
      if (component.hasError) {
        return true;
      }
    }
    return false;
  }

  get bootloaderCanSaveSettings() {
    return firmwareIsNewerOrEqual('1.2.0', this.bootloader.current);
  }
}

export class DeviceTab {
  constructor(data, deviceType, deviceTypesStore, fwUpdateProxy) {
    this.name = '';
    this.type = TabType.DEVICE;
    this.data = data;
    this.editedData = cloneDeep(data);
    this.deviceTypesStore = deviceTypesStore;
    this.deviceType = deviceType;
    this.hasJsonValidationErrors = false;
    this.isDirty = false;
    this.hidden = false;
    this.loading = true;
    this.isDeprecated = deviceTypesStore.isDeprecated(deviceType);
    this.schema = undefined;
    this.isUnknownType = deviceTypesStore.isUnknown(deviceType);
    this.error = '';
    this.acceptJsonEditorInitial = true;
    this.slaveIdIsDuplicate = false;
    this.isModbusDevice = deviceTypesStore.isModbusDevice(deviceType);
    this.devicesWithTheSameId = [];
    this.isDisconnected = false;
    this.embeddedSoftware = new EmbeddedSoftware(fwUpdateProxy);
    this.waitingForDeviceReconnect = false;

    this.updateName();

    makeObservable(this, {
      name: observable,
      isDirty: observable,
      hasJsonValidationErrors: observable,
      hidden: observable,
      isDeprecated: observable,
      deviceType: observable,
      loading: observable,
      error: observable,
      slaveIdIsDuplicate: observable,
      devicesWithTheSameId: observable,
      isDisconnected: observable,
      waitingForDeviceReconnect: observable,
      editedData: observable.ref,
      setData: action.bound,
      updateName: action,
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

  updateName() {
    let name = this.deviceTypesStore.getName(this.deviceType);
    if (!name) {
      name = i18n.t('device-manager.labels.unknown-device-type');
    }
    this.name = `${this.editedData?.slave_id || ''} ` + name;
  }

  setData(data, errors, initial) {
    // On first start json-editor modifies json according to defaults.
    // It is not a config change, so use resulting object as initial device config
    if (initial && this.acceptJsonEditorInitial) {
      this.data = cloneDeep(data);
      this.acceptJsonEditorInitial = false;
    }
    this.isDirty = !isEqual(this.data, data);
    this.editedData = cloneDeep(data);
    this.hasJsonValidationErrors = errors.length !== 0;
    this.updateName();
  }

  async setDeviceType(type) {
    this.loading = true;
    try {
      this.schema = await this.deviceTypesStore.getSchema(type);
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
      const currentSlaveId = this.editedData.slave_id;
      this.editedData = getDefaultObject(this.schema);
      this.editedData.slave_id = currentSlaveId;
      this.isDirty = false;
      this.hasJsonValidationErrors = false;
      this.updateName();
      this.clearError();
      this.loading = false;
    });
  }

  commitData() {
    this.data = cloneDeep(this.editedData);
    this.hasJsonValidationErrors = false;
    this.isDirty = false;
  }

  getCopy() {
    let dataCopy = cloneDeep(this.editedData);
    dataCopy.slave_id = '';
    let tab = new DeviceTab(dataCopy, this.deviceType, this.deviceTypesStore);
    tab.loadSchema();
    runInAction(() => {
      tab.hasJsonValidationErrors = true;
    });
    return tab;
  }

  async loadSchema() {
    if (this.isUnknownType || this.schema !== undefined) {
      this.loading = false;
      return;
    }
    this.loading = true;
    try {
      this.schema = await this.deviceTypesStore.getSchema(this.deviceType);
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
    this.schema = await this.deviceTypesStore.getSchema(this.deviceType);
    runInAction(() => {
      this.acceptJsonEditorInitial = true;
      this.editedData = getDefaultObject(this.schema);
      this.data = cloneDeep(this.editedData);
      this.isDirty = false;
      this.updateName();
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
      this.deviceTypesStore.getDefaultId(this.deviceType, this.editedData.slave_id)
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
    if (this.editedData.id) {
      this.editedData.id = this.editedData.id + '_2';
    } else {
      this.editedData.id =
        this.deviceTypesStore.getDefaultId(this.deviceType, this.editedData.slave_id) + '_2';
    }
    // To trigger mobx update
    this.editedData = cloneDeep(this.editedData);
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
