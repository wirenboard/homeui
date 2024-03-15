'use strict';

import { makeObservable, observable, computed } from 'mobx';
import { cloneDeep } from 'lodash';
import i18n from '../../i18n/react/config';
import SelectModalState from '../components/modals/selectModalState';
import { getDefaultObject } from './jsonSchemaUtils';
import AccessLevelStore from '../components/access-level/accessLevelStore';
import PageWrapperStore from '../components/page-wrapper/pageWrapperStore';
import ConfirmModalState from '../components/modals/confirmModalState';
import AddDeviceModalState from './addDeviceModalState';
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
import { addToConfig } from './configUtils';

function makeUnknownDeviceError(device, first) {
  return i18n.t(
    first ? 'device-manager.errors.first_unknown_device' : 'device-manager.errors.unknown_device',
    { dev: device, interpolation: { escapeValue: false } }
  );
}

function makeMisconfiguredDeviceError(device, first) {
  return i18n.t(
    first
      ? 'device-manager.errors.first_misconfigured_device'
      : 'device-manager.errors.misconfigured_device',
    { dev: device, interpolation: { escapeValue: false } }
  );
}

function makeMergeErrorMessage(unknown, misconfigured) {
  return unknown
    .map((dev, i) => makeUnknownDeviceError(dev, i == 0))
    .concat(misconfigured.map((dev, i) => makeMisconfiguredDeviceError(dev, i == 0)))
    .join('\n');
}

function getPortSchemaCommon(schema, subSchemaName) {
  let res = cloneDeep(schema.definitions[subSchemaName]);
  res.definitions = {};
  res.definitions['commonPortSettings'] = cloneDeep(schema.definitions['commonPortSettings']);
  delete res.definitions['commonPortSettings'].properties.devices;
  res.translations = schema.translations;
  return res;
}

function getSerialPortSchema(schema) {
  return getPortSchemaCommon(schema, 'serialPort');
}

function getTcpPortSchema(schema) {
  let res = getPortSchemaCommon(schema, 'tcpPort');
  res.definitions['commonTcpPortSettings'] = cloneDeep(schema.definitions['commonTcpPortSettings']);
  return res;
}

function getModbusTcpPortSchema(schema) {
  let res = getPortSchemaCommon(schema, 'modbusTcpPort');
  res.definitions['commonTcpPortSettings'] = cloneDeep(schema.definitions['commonTcpPortSettings']);
  return res;
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

function makeDeviceSchemaMap(schema) {
  let res = {};
  schema.definitions.device.oneOf.forEach(d => {
    if (d.properties?.device_type?.enum !== undefined) {
      res[d.properties.device_type.enum[0]] = d;
    } else {
      if (d.properties?.protocol?.enum !== undefined) {
        res[d.properties.protocol.enum[0]] = d;
      }
    }
  });
  delete schema.definitions.device;
  Object.values(res).forEach(d => {
    d.definitions = schema.definitions;
    d.translations = schema.translations;
    if (!d?.options) {
      d.options = {};
    }
    d.options['disable_collapse'] = true;
    d.options['disable_edit_json'] = true;
    if (!d.options?.wb) {
      d.options.wb = {};
    }
    d.options.wb['disable_panel'] = true;
    delete d.options.wb['disable_title'];
  });
  return res;
}

function getPortData(data) {
  let res = cloneDeep(data);
  delete res.devices;
  return res;
}

function makeDeviceTypeSelectOptions(deviceSchemaMap) {
  let groups = {};
  let wbDevicesGroupName;
  let deprecatedWbDevicesGroupName;

  Object.entries(deviceSchemaMap).forEach(([deviceType, schema]) => {
    const groupTag = schema?.options?.wb?.group;
    if (groupTag) {
      const groupName = getTranslation(groupTag, i18n.language, schema.translations);
      if (groupTag == 'g-wb') {
        wbDevicesGroupName = groupName;
      }
      if (groupTag == 'g-wb-old') {
        deprecatedWbDevicesGroupName = groupName;
      }
      groups[groupName] ??= [];
      groups[groupName].push({
        label: getTranslation(schema.title, i18n.language, schema.translations),
        value: deviceType,
        hidden: !!schema?.options?.wb?.hide_from_selection,
      });
    }
  });
  return Object.entries(groups)
    .map(([groupName, devices]) => {
      devices.sort((a, b) => a.label.localeCompare(b.label));
      return { label: groupName, options: devices };
    })
    .sort((a, b) => {
      if (a.label == b.label) {
        return 0;
      }
      if (a.label == wbDevicesGroupName) {
        return -1;
      }
      if (b.label == wbDevicesGroupName) {
        return 1;
      }
      if (a.label == deprecatedWbDevicesGroupName) {
        return -1;
      }
      if (b.label == deprecatedWbDevicesGroupName) {
        return 1;
      }
      return a.label.localeCompare(b.label);
    });
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

class DeviceManagerPageStore {
  constructor(loadConfigFn, saveConfigFn, rolesFactory) {
    this.accessLevelStore = new AccessLevelStore(rolesFactory);
    this.accessLevelStore.setRole(rolesFactory.ROLE_TWO);
    this.pageWrapperStore = new PageWrapperStore();
    this.selectModalState = new SelectModalState();
    this.confirmModalState = new ConfirmModalState();
    this.addDeviceModalState = new AddDeviceModalState();
    this.tabs = new TabsStore();
    this.deviceSchemaMap = {};
    this.portSchemaMap = {};
    this.saveConfigFn = saveConfigFn;
    this.loadConfigFn = loadConfigFn;
    this.loaded = false;
    this.deviceTypeSelectOptions = [];

    makeObservable(this, {
      allowSave: computed,
      isDirty: computed,
      loaded: observable,
    });
  }

  get isDirty() {
    return this.tabs.isDirty;
  }

  get allowSave() {
    return this.isDirty && this.tabs.isValid;
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
    return new DeviceTab(deviceConfig, deviceType, this.deviceSchemaMap[deviceType]);
  }

  createSettingsTab(config, schema) {
    delete config.ports;
    return new SettingsTab(config, getGeneralSettingsSchema(schema));
  }

  async load() {
    try {
      this.loaded = false;
      this.pageWrapperStore.clearError();
      const { config, schema, devices } = await this.loadConfigFn();
      this.portSchemaMap = makePortSchemaMap(schema);
      this.deviceSchemaMap = makeDeviceSchemaMap(schema);
      this.deviceTypeSelectOptions = makeDeviceTypeSelectOptions(this.deviceSchemaMap);
      if (devices) {
        const mergeRes = addToConfig(config, devices, this.deviceSchemaMap);
        this.setError(makeMergeErrorMessage(mergeRes.unknown, mergeRes.misconfigured));
        if (mergeRes.added) {
          this.tabs.setModifiedStructure();
        }
      }
      config.ports.forEach(port => {
        const portTab = this.createPortTab(port);
        if (portTab === undefined) {
          return;
        }
        if (port?.devices) {
          port.devices.forEach(device => {
            portTab.children.push(this.createDeviceTab(device));
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

  setError(msg) {
    this.pageWrapperStore.setError(msg);
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
    let newDeviceType;
    let portTab;
    try {
      [portTab, newDeviceType] = await this.addDeviceModalState.show(
        makePortSelectOptions(this.tabs.portTabs),
        this.deviceTypeSelectOptions,
        this.tabs.selectedPortTab
      );
    } catch (err) {
      if (err == 'cancel') {
        return;
      }
      throw err;
    }
    let deviceTab = this.createDeviceTab(getDefaultObject(this.deviceSchemaMap[newDeviceType]));
    this.tabs.addDeviceTab(portTab, deviceTab);
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
      if (err.data === 'EditorError' && err.code === CONFED_WRITE_FILE_ERROR) {
        this.pageWrapperStore.setError(i18n.t('device-manager.errors.write'));
      } else {
        this.pageWrapperStore.setError(err.message);
      }
    }
    this.pageWrapperStore.setLoading(false);
  }

  changeDeviceType(tab, type) {
    tab.setDeviceType(type, this.deviceSchemaMap[type]);
  }
}

export default DeviceManagerPageStore;
