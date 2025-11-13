import cloneDeep from 'lodash/cloneDeep';
import { makeObservable, observable, computed, action } from 'mobx';
import { DeviceTabStore, setupDevice } from '@/stores/device-manager';
import { loadJsonSchema, Translator, getDefaultValue } from '@/stores/json-schema-editor';
import { formatError } from '@/utils/formatError';
import i18n from '../../../i18n/react/config';
import AccessLevelStore from '../../components/access-level/accessLevelStore';
import ConfirmModalState from '../../components/modals/confirmModalState';
import FormModalState from '../../components/modals/formModalState';
import SelectModalState from '../../components/modals/selectModalState';
import PageWrapperStore from '../../components/page-wrapper/pageWrapperStore';
import { getIntAddress } from '../common/modbusAddressesSet';
import showAddDeviceModal from './addDeviceModal';
import showCopyDeviceModal from './copyDeviceModal';
import { getTranslation } from './jsonSchemaUtils';
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
  if (typeof error === 'object' && error.data === 'EditorError' && error.code === CONFED_WRITE_FILE_ERROR) {
    return i18n.t('device-manager.errors.write');
  }
  return formatError(error);
}

function getDeviceSetupErrorMessage(device, error) {
  return i18n.t('device-manager.errors.setup', {
    device: `${device.title} (${device.address})`,
    error: getErrorMessage(error),
    interpolation: { escapeValue: false },
  });
}

function getSerialPortSchema(schema) {
  return loadJsonSchema(schema.definitions.serialPort, schema.definitions);
}

function getTcpPortSchema(schema) {
  return loadJsonSchema(schema.definitions.tcpPort, schema.definitions);
}

function getModbusTcpPortSchema(schema) {
  return loadJsonSchema(schema.definitions.modbusTcpPort, schema.definitions);
}

function getGeneralSettingsSchema(schema) {
  delete schema.definitions;
  delete schema.properties.ports;
  schema.description = '';
  return loadJsonSchema(schema, schema.definitions);
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
    fwUpdateProxy,
    serialDeviceProxy,
    serialPortProxy
  ) {
    this.accessLevelStore = new AccessLevelStore(rolesFactory);
    this.accessLevelStore.setRole(rolesFactory.ROLE_TWO);
    this.pageWrapperStore = new PageWrapperStore();
    this.selectModalState = new SelectModalState();
    this.confirmModalState = new ConfirmModalState();
    this.tabs = new TabsStore(toMobileContent, toTabs);
    this.deviceTypesStore = deviceTypesStore;
    this.portSchemaMap = {};
    this.schemaTranslator = new Translator({});
    this.saveConfigFn = saveConfigFn;
    this.loadConfigFn = loadConfigFn;
    this.loaded = false;
    this.formModalState = new FormModalState();
    this.fwUpdateProxy = fwUpdateProxy;
    this.serialDeviceProxy = serialDeviceProxy;
    this.serialPortProxy = serialPortProxy;

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
        makeSerialPortTabName,
        this.schemaTranslator
      );
    }
    if (portConfig.port_type === 'tcp') {
      return new PortTab(
        getPortData(portConfig),
        this.portSchemaMap['tcp'],
        makeTcpPortTabName,
        this.schemaTranslator);
    }
    if (portConfig.port_type === 'modbus tcp') {
      return new PortTab(
        getPortData(portConfig),
        this.portSchemaMap['modbus tcp'],
        makeModbusTcpPortTabName,
        this.schemaTranslator
      );
    }
    return undefined;
  }

  createDeviceTab(deviceConfig) {
    return new DeviceTabStore(
      deviceConfig,
      getDeviceTypeFromConfig(deviceConfig),
      this.deviceTypesStore,
      this.fwUpdateProxy,
      this.serialDeviceProxy
    );
  }

  createSettingsTab(config, schema) {
    delete config.ports;
    return new SettingsTab(config, getGeneralSettingsSchema(schema), this.schemaTranslator);
  }

  async load() {
    try {
      this.loaded = false;
      this.pageWrapperStore.clearError();
      const { config, schema, deviceTypeGroups } = await this.loadConfigFn();
      this.schemaTranslator = new Translator();
      this.schemaTranslator.addTranslations(schema.translations);
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
    this.pageWrapperStore.setError(formatError(error));
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
    let tab = this.createPortTab(getDefaultValue(this.portSchemaMap[newPortType]));
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
      this.deviceTypesStore.deviceTypeDropdownOptions,
      this.tabs.selectedPortTab
    );
    if (res === undefined) {
      return;
    }
    const oldSelectedTab = this.tabs.selectedTab;
    let deviceTab = new DeviceTabStore(
      {},
      res.deviceType,
      this.deviceTypesStore,
      this.fwUpdateProxy,
      this.serialDeviceProxy
    );
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
    tab.setDeviceType(type, this.tabs.selectedPortTab?.baseConfig);
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
            let portTab = this.tabs.portTabs.find((p) => p.isEnabled && p.path === device.port);
            if (!portTab) {
              return false;
            }
            const portConfig = portTab.baseConfig;
            const newParams = {
              baud_rate: portConfig?.baudRate,
              parity: portConfig?.parity,
              stop_bits: portConfig?.stopBits,
            };
            return await setupDevice(this.serialPortProxy, device, newParams);
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
    const jsonSchema = loadJsonSchema(await this.deviceTypesStore.getSchema(device.type));
    let deviceConfig = getDefaultValue(jsonSchema);
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
    const portConfig = portTab.baseConfig;
    deviceTab.updateEmbeddedSoftwareVersion(portConfig);
    await deviceTab.loadContent(portConfig);
    this.tabs.addDeviceTab(portTab, deviceTab, selectTab);
  }

  setDeviceDisconnected(topic, error) {
    const deviceTab = this.tabs.findDeviceTabByTopic(topic);
    if (!deviceTab) {
      return;
    }
    const isDisconnected = error === 'r';
    const portTab = this.tabs.findPortTabByDevice(deviceTab);
    deviceTab.setDisconnected(isDisconnected, portTab.baseConfig);
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

  readRegisters(tab) {
    const portTab = this.tabs.selectedPortTab;
    if (tab && portTab) {
      tab.loadContent(portTab.baseConfig);
    }
  }
}

export default ConfigEditorPageStore;
