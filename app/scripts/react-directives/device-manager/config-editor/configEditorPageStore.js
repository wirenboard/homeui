'use strict';

import { makeObservable, observable, computed, action } from 'mobx';
import cloneDeep from 'lodash/cloneDeep';
import i18n from '../../../i18n/react/config';
import SelectModalState from '../../components/modals/selectModalState';
import { getDefaultObject } from './jsonSchemaUtils';
import AccessLevelStore from '../../components/access-level/accessLevelStore';
import PageWrapperStore from '../../components/page-wrapper/pageWrapperStore';
import ConfirmModalState from '../../components/modals/confirmModalState';
import showAddDeviceModal from './addDeviceModal';
import { TabsStore } from './tabsStore';
import { DeviceTab } from './deviceTabStore';
import {
  PortTab,
  makeModbusTcpPortTabName,
  makeSerialPortTabName,
  makeTcpPortTabName,
} from './portTabStore';
import { SettingsTab } from './settingsTabStore';
import { getTranslation } from './jsonSchemaUtils';
import FormModalState from '../../components/modals/formModalState';
import showCopyDeviceModal from './copyDeviceModal';

const CONFED_WRITE_FILE_ERROR = 1002;

function getErrorMessage(error) {
  if (typeof error === 'object') {
    if (error.data === 'EditorError' && error.code === CONFED_WRITE_FILE_ERROR) {
      return i18n.t('device-manager.errors.write');
    }
    if (error.hasOwnProperty('code')) {
      return `${error.message}: ${error.data}(${error.code})`;
    }
    return error.message;
  }
  return String(error);
}

function getDeviceSetupErrorMessage(device, error) {
  return i18n.t('device-manager.errors.setup', {
    device: `${device.title} (${device.address})`,
    error: getErrorMessage(error),
    interpolation: { escapeValue: false },
  });
}

function getPortSchemaCommon(schema, subSchemaName) {
  let res = cloneDeep(schema.definitions[subSchemaName]);
  res.definitions = {};
  Object.entries(schema.definitions).forEach(([key, value]) => {
    if (key != subSchemaName) {
      res.definitions[key] = value;
    }
  });
  res.translations = schema.translations;
  return res;
}

function getSerialPortSchema(schema) {
  return getPortSchemaCommon(schema, 'serialPort');
}

function getTcpPortSchema(schema) {
  return getPortSchemaCommon(schema, 'tcpPort');
}

function getModbusTcpPortSchema(schema) {
  return getPortSchemaCommon(schema, 'modbusTcpPort');
}

function getGeneralSettingsSchema(schema) {
  delete schema.definitions;
  delete schema.properties.ports;
  schema.description = '';
  return schema;
}

function makePortSchemaMap(schema) {
  let res = {};
  res['serial'] = getSerialPortSchema(schema);
  res['tcp'] = getTcpPortSchema(schema);
  res['modbus tcp'] = getModbusTcpPortSchema(schema);
  return res;
}

function getPortData(data) {
  let res = cloneDeep(data);
  delete res.devices;
  return res;
}

function makePortTypeSelectOptions(portSchemaMap) {
  return Object.entries(portSchemaMap).map(([portType, schema]) => {
    return {
      label: getTranslation(schema.title, i18n.language, schema.translations),
      value: portType,
    };
  });
}

function makePortSelectOptions(portTabs) {
  return portTabs.map(tab => {
    return { label: tab.name, value: tab };
  });
}

function getDeviceSetupParams(device, portBaudRate, portParity, portStopBits) {
  if (device === undefined) {
    return undefined;
  }

  let params = {
    path: device.port,
    items: [],
  };

  let commonCfg = {
    slave_id: device.address,
    baud_rate: device.baudRate,
    stop_bits: device.stopBits,
    parity: device.parity,
  };

  if (device.gotByFastScan) {
    // Specifying SN will result fast modbus request
    const numberSn = parseInt(device.sn);
    if (!Number.isNaN(numberSn)) {
      commonCfg.sn = numberSn;
    }
  }

  if (device.baudRate != portBaudRate) {
    let item = Object.assign({}, commonCfg);
    item.cfg = { baud_rate: portBaudRate };
    params.items.push(item);
    commonCfg.baud_rate = item.cfg.baud_rate;
  }

  if (device.stopBits != portStopBits) {
    // Devices with fast modbus support accept both 1 and 2 stop bits
    // So it is not a misconfiguration if the setting differs from port's one
    if (!device.gotByFastScan) {
      let item = Object.assign({}, commonCfg);
      item.cfg = { stop_bits: portStopBits };
      params.items.push(item);
      commonCfg.stop_bits = item.cfg.stop_bits;
    }
  }

  if (device.parity != portParity) {
    const mapping = {
      O: 1,
      E: 2,
    };
    let item = Object.assign({}, commonCfg);
    item.cfg = { parity: mapping[portParity] || 0 };
    params.items.push(item);
  }

  if (device.newAddress) {
    let item = Object.assign({}, commonCfg);
    item.cfg = {
      slave_id: Number.isInteger(device.newAddress)
        ? device.newAddress
        : parseInt(device.newAddress),
    };
    params.items.push(item);
  }

  return params.items.length !== 0 ? params : undefined;
}

function getTopics(portTabs, deviceTypesStore) {
  let topics = new Set();
  portTabs.forEach(portTab => {
    portTab.children.forEach(deviceTab => {
      topics.add(
        deviceTab.editedData.id ||
          deviceTypesStore.getDefaultId(deviceTab.deviceType, deviceTab.slaveId)
      );
    });
  });
  return topics;
}

class ConfigEditorPageStore {
  constructor(
    loadConfigFn,
    saveConfigFn,
    toMobileContent,
    toTabs,
    deviceTypesStore,
    rolesFactory,
    setupDeviceFn
  ) {
    this.accessLevelStore = new AccessLevelStore(rolesFactory);
    this.accessLevelStore.setRole(rolesFactory.ROLE_TWO);
    this.pageWrapperStore = new PageWrapperStore();
    this.selectModalState = new SelectModalState();
    this.confirmModalState = new ConfirmModalState();
    this.tabs = new TabsStore(toMobileContent, toTabs);
    this.deviceTypesStore = deviceTypesStore;
    this.portSchemaMap = {};
    this.saveConfigFn = saveConfigFn;
    this.loadConfigFn = loadConfigFn;
    this.loaded = false;
    this.setupDeviceFn = setupDeviceFn;
    this.formModalState = new FormModalState();

    makeObservable(this, {
      allowSave: computed,
      isDirty: computed,
      loaded: observable,
      addDevices: action,
    });
  }

  get isDirty() {
    return this.tabs.isDirty;
  }

  get allowSave() {
    return this.isDirty && !this.tabs.hasInvalidConfig;
  }

  createPortTab(portConfig) {
    if (portConfig.port_type == 'serial' || portConfig.port_type === undefined) {
      return new PortTab(
        getPortData(portConfig),
        this.portSchemaMap['serial'],
        makeSerialPortTabName
      );
    }
    if (portConfig.port_type == 'tcp') {
      return new PortTab(getPortData(portConfig), this.portSchemaMap['tcp'], makeTcpPortTabName);
    }
    if (portConfig.port_type == 'modbus tcp') {
      return new PortTab(
        getPortData(portConfig),
        this.portSchemaMap['modbus tcp'],
        makeModbusTcpPortTabName
      );
    }
    return undefined;
  }

  createDeviceTab(deviceConfig) {
    const deviceType = deviceConfig?.device_type || deviceConfig?.protocol || 'modbus';
    return new DeviceTab(deviceConfig, deviceType, this.deviceTypesStore);
  }

  createSettingsTab(config, schema) {
    delete config.ports;
    return new SettingsTab(config, getGeneralSettingsSchema(schema));
  }

  async load() {
    try {
      this.loaded = false;
      this.pageWrapperStore.clearError();
      const { config, schema, deviceTypeGroups } = await this.loadConfigFn();
      this.deviceTypesStore.setDeviceTypeGroups(deviceTypeGroups);
      this.portSchemaMap = makePortSchemaMap(schema);
      config?.ports?.forEach(port => {
        const portTab = this.createPortTab(port);
        if (portTab === undefined) {
          return;
        }
        if (port?.devices) {
          port.devices.forEach(device => {
            portTab.addChildren(this.createDeviceTab(device));
          });
        }
        this.tabs.addPortTab(portTab, true);
      });
      this.tabs.addSettingsTab(this.createSettingsTab(config, schema));
      this.loaded = true;
    } catch (err) {
      this.tabs.clear();
      this.setError(err);
      this.loaded = false;
    }
    this.pageWrapperStore.setLoading(false);
  }

  setError(error) {
    if (typeof error === 'object') {
      if (error.hasOwnProperty('code')) {
        this.pageWrapperStore.setError(`${error.message}: ${error.data}(${error.code})`);
      } else {
        this.pageWrapperStore.setError(error.message);
      }
      return;
    }
    this.pageWrapperStore.setError(error);
  }

  async addPort() {
    let newPortType;
    try {
      newPortType = await this.selectModalState.show(
        i18n.t('device-manager.buttons.add-port'),
        i18n.t('device-manager.buttons.add-port'),
        makePortTypeSelectOptions(this.portSchemaMap)
      );
    } catch (err) {
      if (err == 'cancel') {
        return;
      }
    }
    let tab = this.createPortTab(getDefaultObject(this.portSchemaMap[newPortType]));
    this.tabs.addPortTab(tab);
  }

  async showDeleteConfirmModal() {
    return this.confirmModalState.show(
      i18n.t('device-manager.labels.confirm-delete', {
        item: this.tabs.selectedTab?.name,
        interpolation: { escapeValue: false },
      }),
      [
        {
          label: i18n.t('device-manager.buttons.delete'),
          type: 'danger',
        },
      ]
    );
  }

  async deleteTab() {
    if ((await this.showDeleteConfirmModal()) == 'ok') {
      this.tabs.deleteSelectedTab();
    }
  }

  async addDevice() {
    const res = await showAddDeviceModal(
      this.formModalState,
      makePortSelectOptions(this.tabs.portTabs),
      this.deviceTypesStore.deviceTypeSelectOptions,
      this.tabs.selectedPortTab
    );
    if (res === undefined) {
      return;
    }
    let deviceTab = new DeviceTab({}, res.deviceType, this.deviceTypesStore);
    this.tabs.addDeviceTab(res.port, deviceTab, true);
    deviceTab.setDefaultData();
  }

  makeConfigJson() {
    let config = cloneDeep(this.tabs.items[this.tabs.items.length - 1].editedData);
    this.tabs.portTabs.forEach(portTab => {
      config.ports ??= [];
      let portConfig = cloneDeep(portTab.editedData);
      portConfig.devices ??= [];
      portTab.children.forEach(deviceTab => {
        portConfig.devices.push(cloneDeep(deviceTab.editedData));
      });
      config.ports.push(portConfig);
    });
    return config;
  }

  async save() {
    this.pageWrapperStore.setLoading(true);
    this.pageWrapperStore.clearError();
    try {
      await this.saveConfigFn(this.makeConfigJson());
      this.tabs.commitData();
    } catch (err) {
      this.pageWrapperStore.setError(getErrorMessage(err));
    }
    this.pageWrapperStore.setLoading(false);
  }

  changeDeviceType(tab, type) {
    tab.setDeviceType(type);
  }

  /**
   * @typedef {Object} ScannedDevice
   * @property {string} title
   * @property {string} sn
   * @property {number} address
   * @property {number} newAddress
   * @property {string} type
   * @property {string} port
   * @property {number} baudRate
   * @property {string} parity
   * @property {number} stopBits
   * @property {boolean} gotByFastScan
   *
   * @param {ScannedDevice[]} devices
   */
  async addDevices(devices) {
    if (!Array.isArray(devices) || !devices.length) {
      return;
    }
    try {
      this.pageWrapperStore.setLoading(true);
      this.loaded = false;
      this.pageWrapperStore.clearError();
      let errors = [];
      const setupResults = await Promise.all(
        devices.map(async device => {
          try {
            return await this.setupDevice(device);
          } catch (err) {
            errors.push(getDeviceSetupErrorMessage(device, err));
          }
          return false;
        })
      );
      devices = devices.filter((_, i) => setupResults[i]);
      const selectedTab = this.tabs.selectedTab;
      const selectAddedTab = devices.length == 1;
      if (devices.length) {
        const topics = getTopics(this.tabs.portTabs, this.deviceTypesStore);
        await Promise.all(
          devices.map(device => this.addScannedDeviceToConfig(device, topics, selectAddedTab))
        );
        this.tabs.setModifiedStructure();
        if (!selectAddedTab) {
          this.tabs.selectTab(selectedTab);
        }
      }
      this.setError(errors.join('\n'));
    } catch (err) {
      this.setError(err);
    }
    this.loaded = true;
    this.pageWrapperStore.setLoading(false);
  }

  async addScannedDeviceToConfig(device, topics, selectTab) {
    let deviceConfig = getDefaultObject(await this.deviceTypesStore.getSchema(device.type));
    deviceConfig.slave_id = String(device.address);
    const deviceId =
      deviceConfig?.id || this.deviceTypesStore.getDefaultId(device.type, deviceConfig.slave_id);
    if (topics.has(deviceId)) {
      deviceConfig.id = deviceId + '_2';
    } else {
      topics.add(deviceId);
    }
    let portTab = this.tabs.portTabs.find(p => p.editedData?.path == device.port);
    this.tabs.addDeviceTab(portTab, this.createDeviceTab(deviceConfig), selectTab);
  }

  async setupDevice(device) {
    if (!device.type) {
      return false;
    }

    let portTab = this.tabs.portTabs.find(p => p.editedData?.path == device.port);
    if (!portTab) {
      return false;
    }

    const params = getDeviceSetupParams(
      device,
      portTab.editedData.baud_rate,
      portTab.editedData.parity,
      portTab.editedData.stop_bits
    );
    if (params) {
      await this.setupDeviceFn(params);
      device.address = device?.newAddress ?? device.address;
    }

    return true;
  }

  setDeviceDisconnected(topic, error) {
    const tab = this.tabs.findDeviceTabByTopic(topic);
    tab?.setDisconnected(error == 'r');
  }

  async copyTab() {
    let portTab = this.tabs.selectedPortTab;
    let deviceTab = this.tabs.selectedTab;
    const res = await showCopyDeviceModal(
      this.formModalState,
      makePortSelectOptions(this.tabs.portTabs),
      portTab
    );
    if (res) {
      for (let i = 0; i < res.count; ++i) {
        this.tabs.addDeviceTab(res.port, deviceTab.getCopy(), i == 0);
      }
    }
  }
}

export default ConfigEditorPageStore;
