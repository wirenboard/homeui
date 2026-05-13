import cloneDeep from 'lodash/cloneDeep';
import { makeObservable, observable, computed, action } from 'mobx';
import { DeviceTabStore, type DeviceTypesStore, setupDevice } from '@/stores/device-manager';
import type { PortTabSerialConfig } from '@/stores/device-manager/port-tab/types';
import type { FwUpdateProxy, ScannedDevice, SerialDeviceProxy, SerialPortProxy } from '@/stores/device-manager/types';
import { getIntAddress } from '@/stores/device-manager/utils';
import {
  loadJsonSchema,
  Translator,
  getDefaultValue,
  type JsonObject,
  type JsonSchema,
} from '@/stores/json-schema-editor';
import { formatError } from '@/utils/formatError';
import i18n from '~/i18n/react/config';
import { getTranslation } from '../stores/json-schema-utils';
import {
  getDeviceSetupErrorMessage,
  getDeviceTypeFromConfig,
  getErrorMessage,
  getGeneralSettingsSchema,
  getPortData,
  getTopics,
  makePortSchemaMap,
} from './helpers';
import { PortTab, makeModbusTcpPortTabName, makeSerialPortTabName, makeTcpPortTabName } from './port-tab-store';
import { SettingsTab } from './settings-tab-store';
import { TabsStore } from './tabs-store';
import type { ConfigJson, LoadConfigResult, PortConfig } from './types';

export class ConfigEditorPageStore {
  public tabs: TabsStore;
  public schemaTranslator: Translator;
  public loaded: boolean = false;
  public loading: boolean = true;
  public error = '';
  public deviceTypesStore: DeviceTypesStore;
  public fwUpdateProxy: FwUpdateProxy;
  public serialDeviceProxy: SerialDeviceProxy;
  public serialPortProxy: SerialPortProxy;
  public loadConfigFn: () => Promise<LoadConfigResult>;
  public saveConfigFn: (_cfg: ConfigJson) => Promise<void>;
  public portSchemaMap = {};

  constructor(
    loadConfigFn: () => Promise<LoadConfigResult>,
    saveConfigFn: (_cfg: ConfigJson) => Promise<void>,
    toMobileContent: () => void,
    toTabs: () => void,
    deviceTypesStore: DeviceTypesStore,
    fwUpdateProxy: FwUpdateProxy,
    serialDeviceProxy: SerialDeviceProxy,
    serialPortProxy: SerialPortProxy,
  ) {
    this.tabs = new TabsStore(toMobileContent, toTabs);
    this.deviceTypesStore = deviceTypesStore;
    this.schemaTranslator = new Translator();
    this.saveConfigFn = saveConfigFn;
    this.loadConfigFn = loadConfigFn;
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

  createPortTab(portConfig: PortConfig) {
    if (portConfig.port_type === 'serial' || portConfig.port_type === undefined) {
      return new PortTab(
        getPortData(portConfig),
        this.portSchemaMap['serial'],
        makeSerialPortTabName,
        this.schemaTranslator,
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
        this.schemaTranslator,
      );
    }
    return undefined;
  }

  createDeviceTab(deviceConfig: JsonObject) {
    return new DeviceTabStore(
      deviceConfig,
      getDeviceTypeFromConfig(deviceConfig),
      this.deviceTypesStore,
      this.fwUpdateProxy,
      this.serialDeviceProxy,
    );
  }

  createSettingsTab(config: ConfigJson, schema: any) {
    delete config.ports;
    return new SettingsTab(config, getGeneralSettingsSchema(schema), this.schemaTranslator);
  }

  async load() {
    try {
      this.loaded = false;
      this.error = '';
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
            const tab = this.createDeviceTab(device);
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
    this.loading = false;
  }

  setError(error) {
    this.error = formatError(error);
  }

  async addPort(showAddPortModal: () => Promise<string | null>) {
    const port = await showAddPortModal();
    if (!port) {
      return;
    }
    requestAnimationFrame(() => {
      this.tabs.addPortTab(this.createPortTab(getDefaultValue(this.portSchemaMap[port]) ?? {}));
    });
  }

  getPortTypeSelectOptions() {
    return Object.entries(this.portSchemaMap).map(([portType, schema]: [string, JsonSchema]) => ({
      label: getTranslation(schema.title, i18n.language, schema.translations),
      value: portType,
    }));
  }

  async deleteTab(showDeleteModal: () => Promise<boolean>) {
    if (await showDeleteModal()) {
      this.tabs.deleteSelectedTab();
    }
  }

  async deletePortDevices(showDeleteModal: () => Promise<boolean>) {
    if (await showDeleteModal()) {
      this.tabs.deletePortDevices(this.tabs.selectedTab as PortTab);
    }
  }

  async addDevice(showAddDeviceModal: () => Promise<{ port: string; deviceType: string } | null>) {
    const res = await showAddDeviceModal();
    if (!res) {
      return;
    }
    const oldSelectedTab = this.tabs.selectedTab;
    const deviceTab = new DeviceTabStore(
      {},
      res.deviceType,
      this.deviceTypesStore,
      this.fwUpdateProxy,
      this.serialDeviceProxy,
    );
    this.tabs.addDeviceTab(this.tabs.portTabs.find((port) => port.path === res.port), deviceTab, true);
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

  makeConfigJson(): ConfigJson {
    const config = cloneDeep(this.tabs.items[this.tabs.items.length - 1].editedData);
    this.tabs.portTabs.forEach((portTab) => {
      config.ports ??= [];
      const portConfig = cloneDeep(portTab.editedData);
      portConfig.devices ??= [];
      portTab.children.forEach((deviceTab) => {
        portConfig.devices.push(cloneDeep(deviceTab.editedData));
      });
      config.ports.push(portConfig);
    });
    return config;
  }

  async save() {
    this.loading = true;
    this.error = '';
    try {
      await this.saveConfigFn(this.makeConfigJson());
      this.tabs.commitData();
    } catch (err) {
      this.error = getErrorMessage(err);
    }
    this.loading = false;
  }

  async changeDeviceType(tab: DeviceTabStore, type: string) {
    return tab.setDeviceType(type, this.tabs.selectedPortTab?.baseConfig);
  }

  async addDevices(devices: ScannedDevice[]) {
    if (!Array.isArray(devices) || !devices.length) {
      return;
    }
    try {
      this.loading = true;
      this.loaded = false;
      this.error = '';
      const errors = [];
      const setupResults = await Promise.all(
        devices.map(async (device) => {
          try {
            const portTab = this.tabs.portTabs.find((p) => p.isEnabled && p.path === device.port);
            if (!portTab) {
              return false;
            }
            const portConfig = portTab.baseConfig as PortTabSerialConfig;
            const newParams = {
              slave_id: getIntAddress(device.newAddress || device.address),
              baud_rate: portConfig?.baudRate,
              parity: portConfig?.parity,
              stop_bits: portConfig?.stopBits,
            };
            return await setupDevice(this.serialPortProxy, device, newParams);
          } catch (err) {
            errors.push(getDeviceSetupErrorMessage(device, err));
          }
          return false;
        }),
      );
      const changedDevices = devices.filter((_, i) => setupResults[i]);
      const selectAddedTab = changedDevices.length === 1;
      if (changedDevices.length) {
        const topics = getTopics(this.tabs.portTabs, this.deviceTypesStore);
        await Promise.all(
          changedDevices.map((device) => this.addScannedDeviceToConfig(device, topics, selectAddedTab)),
        );
        this.tabs.setModifiedStructure();
        if (!selectAddedTab) {
          this.tabs.selectTab(this.tabs.selectedTab);
        }
      }
      this.setError(errors.join('\n'));
    } catch (err) {
      this.setError(err);
    }
    this.loaded = true;
    this.loading = false;
  }

  async addScannedDeviceToConfig(device: ScannedDevice, topics: Set<string>, selectTab: boolean) {
    const jsonSchema = loadJsonSchema(await this.deviceTypesStore.getSchema(device.type));
    const deviceConfig = getDefaultValue(jsonSchema) ?? {};
    deviceConfig.slave_id = String(device.newAddress ? device.newAddress : device.address);
    const deviceId = deviceConfig?.id || this.deviceTypesStore.getDefaultId(device.type, deviceConfig.slave_id);
    if (topics.has(deviceId)) {
      deviceConfig.id = deviceId + '_2';
    } else {
      topics.add(deviceId);
    }
    const portTab = this.tabs.portTabs.find((p) => p.isEnabled && p.path === device.port);
    const deviceTab = this.createDeviceTab(deviceConfig);
    const portConfig = portTab.baseConfig;
    deviceTab.updateEmbeddedSoftwareVersion(portConfig);
    await deviceTab.loadContent(portConfig);
    this.tabs.addDeviceTab(portTab, deviceTab, selectTab);
  }

  setDeviceDisconnected(topic: string, error: string) {
    const deviceTab = this.tabs.findDeviceTabByTopic(topic);
    if (deviceTab) {
      const isDisconnected = error === 'r';
      const portTab = this.tabs.findPortTabByDevice(deviceTab);
      deviceTab.setDisconnected(isDisconnected, portTab.baseConfig);
    }
  }

  async copyTab(showCopyDeviceModal: () => Promise<{ port: string; count: number } | null>) {
    const deviceTab = this.tabs.selectedTab as DeviceTabStore;
    const res = await showCopyDeviceModal();
    if (!res) {
      return;
    }
    for (let i = 0; i < res.count; ++i) {
      requestAnimationFrame(() => {
        this.tabs.addDeviceTab(this.tabs.portTabs.find((port) => port.path === res.port), deviceTab.getCopy(), i === 0);
      });
    }
  }

  getPortOptions() {
    return this.tabs.portTabs.map((tab) => ({ label: tab.name, value: tab.path }));
  }

  setEmbeddedSoftwareUpdateProgress(data) {
    data.devices.forEach((device) => {
      const portTab = this.tabs.findPortTabByPath(device.port.path, device.protocol);
      if (portTab) {
        const portConfig = portTab.baseConfig;
        portTab.children
          ?.filter((deviceTab) => getIntAddress(deviceTab.slaveId) === getIntAddress(device.slave_id))
          .forEach((deviceTab) => {
            deviceTab.setEmbeddedSoftwareUpdateProgress(device, portConfig);
          });
      }
    });
  }

  updateFirmware() {
    const tab = this.tabs.selectedTab as DeviceTabStore;
    if (tab) {
      tab.startFirmwareUpdate(this.tabs.selectedPortTab.baseConfig);
    }
  }

  updateBootloader() {
    const tab = this.tabs.selectedTab as DeviceTabStore;
    if (tab) {
      const portTab = this.tabs.selectedPortTab;
      tab.startBootloaderUpdate(portTab.baseConfig);
    }
  }

  updateComponents(){
    const tab = this.tabs.selectedTab as DeviceTabStore;
    if (tab) {
      tab.startComponentsUpdate(this.tabs.selectedPortTab.baseConfig);
    }
  }

  readRegisters(tab: DeviceTabStore, isForce: boolean = false) {
    const portTab = this.tabs.selectedPortTab;
    if (tab && portTab) {
      tab.loadContent(portTab.baseConfig, isForce);
    }
  }
}
