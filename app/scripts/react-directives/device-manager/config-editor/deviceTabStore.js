'use strict';

import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { getDefaultObject } from './jsonSchemaUtils';
import { TabType } from './tabsStore';
import i18n from '../../../i18n/react/config';
import firmwareIsNewer from '../../../utils/fwUtils';
import { getIntAddress } from '../common/modbusAddressesSet';

function toRpcPortConfig(portConfig) {
  if (portConfig.hasOwnProperty('address')) {
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

export class Firmware {
  current = '';
  available = '';
  fwUpdateProxy;
  updateProgress = null;
  canUpdate = false;

  constructor(fwUpdateProxy) {
    this.fwUpdateProxy = fwUpdateProxy;
    makeObservable(this, {
      current: observable,
      available: observable,
      updateProgress: observable,
      hasUpdate: computed,
      clearVersion: action,
      setUpdateProgress: action,
      startFirmwareUpdate: action,
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
          this.current = res.fw;
          this.available = res.available_fw;
          this.canUpdate = res.can_update;
        });
      }
    } catch (err) {
      this.clearVersion();
    }
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

  setUpdateProgress(fromFw, toFw, value) {
    this.updateProgress = value;
    this.current = fromFw;
    this.available = toFw;
    if (this.updateProgress === 100) {
      this.updateProgress = null;
      this.current = '';
      this.available = '';
    }
  }

  get isUpdating() {
    return this.updateProgress !== null;
  }

  async startFirmwareUpdate(address, portConfig) {
    this.updateProgress = 0;
    try {
      await this.fwUpdateProxy.Update({
        slave_id: getIntAddress(address),
        port: toRpcPortConfig(portConfig),
      });
    } catch (err) {
      this.updateProgress = null;
      throw err;
    }
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
    this.firmware = new Firmware(fwUpdateProxy);
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
      setFirmwareUpdateProgress: action,
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
    this.hasJsonValidationErrors = errors.length != 0;
    this.updateName();
  }

  async setDeviceType(type) {
    this.loading = true;
    try {
      this.schema = await this.deviceTypesStore.getSchema(type);
    } catch (err) {
      this.setError(err.message);
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
    try {
      this.schema = await this.deviceTypesStore.getSchema(this.deviceType);
    } catch (err) {
      this.setError(err.message);
      this.setLoading(false);
      return;
    }
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
      if (!this.firmware.isUpdating) {
        this.firmware.clearVersion();
      }
    } else {
      this.waitingForDeviceReconnect = false;
    }
    this.isDisconnected = value;
  }

  setLoading(value) {
    this.loading = value;
  }

  updateFirmwareVersion(portConfig) {
    this.firmware.updateVersion(this.slaveId, portConfig);
  }

  async startFirmwareUpdate(portConfig) {
    try {
      await this.firmware.startFirmwareUpdate(this.slaveId, portConfig);
    } catch (err) {
      this.setError(err.message);
    }
  }

  setError(err) {
    this.error = err.message;
  }

  clearError() {
    this.setError('');
  }

  setFirmwareUpdateProgress(from_fw, to_fw, progress) {
    this.firmware.setUpdateProgress(from_fw, to_fw, progress);
    if (progress === 100) {
      this.waitingForDeviceReconnect = true;
      setTimeout(() => {
        runInAction(() => {
          this.waitingForDeviceReconnect = false;
        });
      }, 2000);
    }
  }

  get showDisconnectedError() {
    return this.isDisconnected && !this.firmware.isUpdating && !this.waitingForDeviceReconnect;
  }
}
