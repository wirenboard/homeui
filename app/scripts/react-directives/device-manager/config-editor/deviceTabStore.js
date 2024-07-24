'use strict';

import { makeObservable, observable, action, runInAction, computed } from 'mobx';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { getDefaultObject } from './jsonSchemaUtils';
import { TabType } from './tabsStore';
import i18n from '../../../i18n/react/config';
import firmwareIsNewer from '../../../utils/fwUtils';
import { getIntAddress } from '../common/modbusAddressesSet';

export class FirmwareVersion {
  current = '';
  available = '';
  deviceManagerProxy;

  constructor(deviceManagerProxy) {
    this.deviceManagerProxy = deviceManagerProxy;
    makeObservable(this, {
      current: observable,
      available: observable,
      hasUpdate: computed,
      clear: action,
    });
  }

  async update(address, portConfig) {
    try {
      if (await this.deviceManagerProxy.hasMethod('GetFirmwareInfo')) {
        let res = await this.deviceManagerProxy.GetFirmwareInfo({
          address: getIntAddress(address),
          path: portConfig.path,
          baud_rate: portConfig.baudRate,
          parity: portConfig.parity,
          stop_bits: portConfig.stopBits,
        });
        runInAction(() => {
          this.current = res.fw;
          this.available = res.available_fw;
        });
      }
    } catch (err) {
      this.clear();
    }
  }

  clear() {
    this.current = '';
    this.available = '';
  }

  get hasUpdate() {
    if (this.current === '' || this.available === '') {
      return false;
    }
    return firmwareIsNewer(this.current, this.available);
  }
}

export class DeviceTab {
  constructor(data, deviceType, deviceTypesStore, deviceManagerProxy) {
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
    this.firmwareVersion = new FirmwareVersion(deviceManagerProxy);

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
      hasInvalidConfig: computed,
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
      runInAction(() => {
        this.error = err.message;
        this.loading = false;
      });
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
      runInAction(() => {
        this.error = err.message;
      });
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
      runInAction(() => {
        this.error = err.message;
        this.loading = false;
      });
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
      this.firmwareVersion.clear();
    }
    this.isDisconnected = value;
  }

  setLoading(value) {
    this.loading = value;
  }

  updateFirmwareVersion(portConfig) {
    this.firmwareVersion.update(this.slaveId, portConfig);
  }
}
