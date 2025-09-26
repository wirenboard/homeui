import cloneDeep from 'lodash/cloneDeep';
import { makeObservable, observable, computed, action } from 'mobx';
import i18n from '../../../i18n/react/config';
import AccessLevelStore from '../../components/access-level/accessLevelStore';
import ConfirmModalState from '../../components/modals/confirmModalState';
import FormModalState from '../../components/modals/formModalState';
import SelectModalState from '../../components/modals/selectModalState';
import PageWrapperStore from '../../components/page-wrapper/pageWrapperStore';
import { getIntAddress } from '../common/modbusAddressesSet';
import showAddDeviceModal from './addDeviceModal';
import showCopyDeviceModal from './copyDeviceModal';
import { DeviceTab, toRpcPortConfig } from './deviceTabStore';
import { getTranslation, getDefaultObject } from './jsonSchemaUtils';
import {
  PortTab,
  makeModbusTcpPortTabName,
  makeSerialPortTabName,
  makeTcpPortTabName
} from './portTabStore';
import { SettingsTab } from './settingsTabStore';
import { TabsStore } from './tabsStore';

const CONFED_WRITE_FILE_ERROR = 1002;

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
 **/

function getErrorMessage(error) {
  if (typeof error === 'object') {
    if (error.data === 'EditorError' && error.code === CONFED_WRITE_FILE_ERROR) {
      return i18n.t('device-manager.errors.write');
    }
    if (Object.hasOwn(error, 'code')) {
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
    if (key !== subSchemaName) {
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
  return portTabs.map((tab) => {
    return { label: tab.name, value: tab };
  });
}

function setSerialNumberForDeviceSetupRPCCall(device, params) {
  if (!device?.gotByFastScan) {
    return;
  }
  let numberSn;
  try {
    numberSn = BigInt(device.sn);
  } catch {
    return;
  }
  // In a fast modbus call we must use in sn parameter the same value as in 270, 271 registers
  // For MAP devices sn occupies 25 bits in 270, 271 registers and the rest most significant bits are set to 1
  const re = new RegExp('\\S*MAP\\d+\\S*');
  if (re.test(device.type)) {
    numberSn = numberSn + 4261412864n; // 0xFE000000
  }
  // Specifying SN will result fast modbus request
  params.sn = Number(numberSn);
}

/**
 * Makes parameters for wb-mqtt-serial's port/Setup RPC call
 *
 * @param {ScannedDevice} device - The object containing the device information.
 * @param {number} portBaudRate - The baud rate of the port.
 * @param {string} portParity - The parity setting of the port.
 * @param {number} portStopBits - The stop bits setting of the port.
 * @returns {object|undefined} - The parameters object containing the device setup parameters, or undefined if no parameters are found.
 */
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

  if (device.newAddress) {
    let item = Object.assign({}, commonCfg);
    setSerialNumberForDeviceSetupRPCCall(device, item);
    item.cfg = {
      slave_id: getIntAddress(device.newAddress),
    };
    params.items.push(item);
    commonCfg.slave_id = item.cfg.slave_id;
  }

  if (portBaudRate !== undefined && device.baudRate !== portBaudRate) {
    let item = Object.assign({}, commonCfg);
    item.cfg = { baud_rate: portBaudRate };
    params.items.push(item);
    commonCfg.baud_rate = item.cfg.baud_rate;
  }

  if (portStopBits !== undefined && device.stopBits !== portStopBits) {
    // Devices with fast modbus support accept both 1 and 2 stop bits
    // So it is not a misconfiguration if the setting differs from port's one
    if (!device.gotByFastScan) {
      let item = Object.assign({}, commonCfg);
      item.cfg = { stop_bits: portStopBits };
      params.items.push(item);
      commonCfg.stop_bits = item.cfg.stop_bits;
    }
  }

  if (portParity !== undefined && device.parity !== portParity) {
    const mapping = {
      O: 1,
      E: 2,
    };
    let item = Object.assign({}, commonCfg);
    item.cfg = { parity: mapping[portParity] || 0 };
    params.items.push(item);
  }

  return params.items.length !== 0 ? params : undefined;
}

function getTopics(portTabs, deviceTypesStore) {
  let topics = new Set();
  portTabs.forEach((portTab) => {
    portTab.children.forEach((deviceTab) => {
      topics.add(
        deviceTab.editedData.id ||
          deviceTypesStore.getDefaultId(deviceTab.deviceType, deviceTab.slaveId)
      );
    });
  });
  return topics;
}

function getDeviceTypeFromConfig(deviceConfig) {
  if (deviceConfig?.device_type) {
    return deviceConfig.device_type;
  }
  return 'protocol:' + (deviceConfig?.protocol || 'modbus');
}

class ConfigEditorPageStore {
  constructor(
    loadConfigFn,
    saveConfigFn,
    toMobileContent,
    toTabs,
    deviceTypesStore,
    rolesFactory,
    setupDeviceFn,
    fwUpdateProxy
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
    this.fwUpdateProxy = fwUpdateProxy;

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
    if (portConfig.port_type === 'serial' || portConfig.port_type === undefined) {
      return new PortTab(
        getPortData(portConfig),
        this.portSchemaMap['serial'],
        makeSerialPortTabName
      );
    }
    if (portConfig.port_type === 'tcp') {
      return new PortTab(getPortData(portConfig), this.portSchemaMap['tcp'], makeTcpPortTabName);
    }
    if (portConfig.port_type === 'modbus tcp') {
      return new PortTab(
        getPortData(portConfig),
        this.portSchemaMap['modbus tcp'],
        makeModbusTcpPortTabName
      );
    }
    return undefined;
  }

  createDeviceTab(deviceConfig) {
    return new DeviceTab(
      deviceConfig,
      getDeviceTypeFromConfig(deviceConfig),
      this.deviceTypesStore,
      this.fwUpdateProxy
    );
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
      config?.ports?.forEach((port) => {
        const portTab = this.createPortTab(port);
        if (portTab === undefined) {
          return;
        }
        if (port?.devices) {
          port.devices.forEach((device) => {
            let tab = this.createDeviceTab(device);
            portTab.addChildren(tab);
            if (portTab.isEnabled) {
              tab.updateEmbeddedSoftwareVersion(portTab.baseConfig);
            }
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
      if (Object.hasOwn(error, 'code')) {
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
      if (err === 'cancel') {
        return;
      }
    }
    let tab = this.createPortTab(getDefaultObject(this.portSchemaMap[newPortType]));
    this.tabs.addPortTab(tab);
  }

  async showDeleteConfirmModal(transKey, tabName) {
    return this.confirmModalState.show(
      i18n.t(transKey, {
        item: tabName,
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

  async showDeleteTabConfirmModal() {
    return this.showDeleteConfirmModal(
      'device-manager.labels.confirm-delete',
      this.tabs.selectedTab?.name
    );
  }

  async showDeletePortDevicesConfirmModal(portTab) {
    return this.showDeleteConfirmModal(
      'device-manager.labels.confirm-delete-port-devices',
      portTab?.name
    );
  }

  async deleteTab() {
    if ((await this.showDeleteTabConfirmModal()) === 'ok') {
      this.tabs.deleteSelectedTab();
    }
  }

  async deletePortDevices(portTab) {
    if ((await this.showDeletePortDevicesConfirmModal(portTab)) === 'ok') {
      this.tabs.deletePortDevices(portTab);
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
    const oldSelectedTab = this.tabs.selectedTab;
    let deviceTab = new DeviceTab({}, res.deviceType, this.deviceTypesStore);
    this.tabs.addDeviceTab(res.port, deviceTab, true);
    try {
      await deviceTab.setDefaultData();
    } catch (err) {
      const errorMsg = i18n.t('device-manager.errors.add-device', {
        error: getErrorMessage(err),
        interpolation: { escapeValue: false },
      });
      this.setError(errorMsg);
      this.tabs.selectTab(oldSelectedTab);
      this.tabs.deleteTab(deviceTab);
    }
  }

  makeConfigJson() {
    let config = cloneDeep(this.tabs.items[this.tabs.items.length - 1].editedData);
    this.tabs.portTabs.forEach((portTab) => {
      config.ports ??= [];
      let portConfig = cloneDeep(portTab.editedData);
      portConfig.devices ??= [];
      portTab.children.forEach((deviceTab) => {
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
        devices.map(async (device) => {
          try {
            return await this.setupDevice(device);
          } catch (err) {
            errors.push(getDeviceSetupErrorMessage(device, err));
          }
          return false;
        })
      );
      let changedDevices = devices.filter((_, i) => setupResults[i]);
      const selectedTab = this.tabs.selectedTab;
      const selectAddedTab = changedDevices.length === 1;
      if (changedDevices.length) {
        const topics = getTopics(this.tabs.portTabs, this.deviceTypesStore);
        await Promise.all(
          changedDevices.map((device) => this.addScannedDeviceToConfig(device, topics, selectAddedTab))
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
    let portTab = this.tabs.portTabs.find((p) => p.isEnabled && p.path === device.port);
    let deviceTab = this.createDeviceTab(deviceConfig);
    deviceTab.updateEmbeddedSoftwareVersion(portTab.baseConfig);
    this.tabs.addDeviceTab(portTab, deviceTab, selectTab);
  }

  async restoreDevice(device, portTab) {
    if (!device.bootloaderMode) {
      await this.setupDevice(device);
      return;
    }

    const portConfig = portTab.baseConfig;
    let params = { slave_id: getIntAddress(device.address), port: toRpcPortConfig(portConfig) };
    if (portConfig.modbusTcp) {
      params.protocol = 'modbus-tcp';
    }
    await this.fwUpdateProxy.Restore(params);
  }

  /**
   * @param {ScannedDevice} device - The device to be set up.
   * @returns {boolean} - Returns true if the device was set up successfully, otherwise false.
   */
  async setupDevice(device) {
    if (!device.type) {
      return false;
    }

    let portTab = this.tabs.portTabs.find((p) => p.isEnabled && p.path === device.port);
    if (!portTab) {
      return false;
    }

    const params = getDeviceSetupParams(
      device,
      portTab.baseConfig?.baudRate,
      portTab.baseConfig?.parity,
      portTab.baseConfig?.stopBits
    );
    if (params) {
      await this.setupDeviceFn(params);
      device.address = device?.newAddress ?? device.address;
    }

    return true;
  }

  setDeviceDisconnected(topic, error) {
    const deviceTab = this.tabs.findDeviceTabByTopic(topic);
    if (!deviceTab) {
      return;
    }
    const isDisconnected = error === 'r';
    deviceTab.setDisconnected(isDisconnected);
    if (!isDisconnected) {
      const portTab = this.tabs.findPortTabByDevice(deviceTab);
      if (portTab) {
        deviceTab.updateEmbeddedSoftwareVersion(portTab.baseConfig);
      }
    }
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
        this.tabs.addDeviceTab(res.port, deviceTab.getCopy(), i === 0);
      }
    }
  }

  setEmbeddedSoftwareUpdateProgress(data) {
    data.devices.forEach((device) => {
      this.tabs
        .findPortTabByPath(device.port.path, device.protocol)
        ?.children?.filter(
          (deviceTab) => getIntAddress(deviceTab.slaveId) === getIntAddress(device.slave_id)
        )
        .forEach((deviceTab) => {
          deviceTab.clearError();
          deviceTab.setEmbeddedSoftwareUpdateProgress(device);
        });
    });
  }

  updateFirmware() {
    const tab = this.tabs.selectedTab;
    if (tab) {
      const portTab = this.tabs.selectedPortTab;
      tab.startFirmwareUpdate(portTab.baseConfig);
    }
  }

  updateBootloader() {
    const tab = this.tabs.selectedTab;
    if (tab) {
      const portTab = this.tabs.selectedPortTab;
      tab.startBootloaderUpdate(portTab.baseConfig);
    }
  }

  updateComponents(){
    const tab = this.tabs.selectedTab;
    if (tab) {
      const portTab = this.tabs.selectedPortTab;
      tab.startComponentsUpdate(portTab.baseConfig);
    }
  }
}

export default ConfigEditorPageStore;
