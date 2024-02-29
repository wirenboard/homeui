'use strict';

import { makeAutoObservable, makeObservable, observable, computed, action } from 'mobx';
import { cloneDeep, isEqual } from 'lodash';
import i18n from '../../i18n/react/config';
import SelectModalState from '../components/modals/selectModalState';
import { getDefaultObject } from './jsonSchemaUtils';
import AccessLevelStore from '../components/access-level/accessLevelStore';
import PageWrapperStore from '../components/page-wrapper/pageWrapperStore';
import ConfirmModalState from '../components/modals/confirmModalState';

function getTranslation(key, translations) {
  return translations[i18n.language]?.[key] || translations?.en?.[key] || key;
}

function getPortSchemaCommon(schema, subSchemaName) {
  let res = cloneDeep(schema.definitions[subSchemaName]);
  res.definitions = {};
  res.definitions['commonPortSettings'] = cloneDeep(schema.definitions['commonPortSettings']);
  delete res.definitions['commonPortSettings'].properties.devices;
  res.translations = schema.translations;
  res.defaultProperties = res.defaultProperties.filter(p => p != 'devices');
  res.options['disable_collapse'] = true;
  res.options['disable_edit_json'] = true;
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

function makeSerialPortTabName(data, schema) {
  return data?.path?.replace(/^\/dev\/tty/, '');
}

function makeTcpPortTabName(data, schema) {
  return `TCP ${data.address || ''}:${data.port || ''}`;
}

function makeModbusTcpPortTabName(data, schema) {
  return `MODBUS TCP ${data.address || ''}:${data.port || ''}`;
}

function makeDeviceTabName(data, schema) {
  return `${data.slave_id || ''} ` + getTranslation(schema.title, schema.translations);
}

class Tab {
  constructor(type, data, schema, nameGenerationFn) {
    this.name = '';
    this.type = type;
    this.data = data;
    this.editedData = cloneDeep(data);
    this.schema = schema;
    this.isValid = true;
    this.isDirty = false;
    this.nameGenerationFn = nameGenerationFn;

    this.updateName();

    makeObservable(this, {
      name: observable,
      isValid: observable,
      isDirty: observable,
      setData: action.bound,
      updateName: action,
      submit: action,
    });
  }

  updateName() {
    this.name = this.nameGenerationFn(this.editedData, this.schema);
  }

  setData(data, errors) {
    this.isDirty = !isEqual(this.data, data);
    this.editedData = cloneDeep(data);
    this.isValid = errors.length == 0;
    this.updateName();
  }

  submit() {
    this.data = cloneDeep(this.editedData);
    this.isValid = true;
    this.isDirty = false;
  }
}

class TabsStore {
  constructor() {
    this.items = [];
    this.selectedTabIndex = 0;
    this.hasNewOrDeletedItems = false;

    makeAutoObservable(this);
  }

  addTab(tab, initial) {
    if (tab.type == 'port') {
      this.items.push(tab);
      if (!initial) {
        this.selectedTabIndex = this.items.length - 1;
        this.hasNewOrDeletedItems = true;
      }
      return;
    }
    let i = this.selectedTabIndex + 1;
    while (i < this.items.length && this.items[i]?.type != 'port') {
      i++;
    }
    this.items.splice(i, 0, tab);
    if (!initial) {
      this.selectedTabIndex = i;
      this.hasNewOrDeletedItems = true;
    }
  }

  onSelectTab(index, lastIndex) {
    this.selectedTabIndex = index;
    return true;
  }

  selectTab(index) {
    this.selectedTabIndex = index;
  }

  deleteSelectedTab() {
    let count = 1;
    if (this.items[this.selectedTabIndex]?.type == 'port') {
      while (
        this.selectedTabIndex + count < this.items.length &&
        this.items[this.selectedTabIndex + count]?.type == 'device'
      ) {
        count++;
      }
    }
    this.items.splice(this.selectedTabIndex, count);
    this.selectedTabIndex = 0;
    this.hasNewOrDeletedItems = true;
  }

  get selectedPortTab() {
    let i = this.selectedTabIndex;
    while (i >= 0 && this.items[i]?.type != 'port') {
      i--;
    }
    if (i >= this.items.length) {
      return undefined;
    }
    return this.items[i];
  }

  get isValid() {
    return this.items.every(item => item.isValid);
  }

  get isDirty() {
    return this.hasNewOrDeletedItems || this.items.some(item => item.isDirty);
  }

  get isEmpty() {
    return this.items.length == 0;
  }

  submit() {
    this.items.forEach(item => item.submit());
    this.hasNewOrDeletedItems = false;
  }

  clear() {
    this.items.splice(0, this.items.length);
    this.hasNewOrDeletedItems = false;
  }
}

class DeviceManagerPageStore {
  constructor(loadConfigFn, saveConfigFn, rolesFactory) {
    this.accessLevelStore = new AccessLevelStore(rolesFactory);
    this.accessLevelStore.setRole(rolesFactory.ROLE_TWO);
    this.pageWrapperStore = new PageWrapperStore();
    this.selectModalState = new SelectModalState();
    this.confirmModalState = new ConfirmModalState();
    this.tabs = new TabsStore();
    this.deviceSchemaMap = {};
    this.portSchemaMap = {};
    this.saveConfigFn = saveConfigFn;
    this.loadConfigFn = loadConfigFn;
    this.loaded = false;

    makeObservable(this, {
      allowSave: computed,
      isDirty: computed,
      loaded: observable,
    });
  }

  onSelectTab(index, lastIndex) {
    return this.tabs.onSelectTab(index, lastIndex);
  }

  get isDirty() {
    return this.tabs.isDirty;
  }

  get allowSave() {
    return this.isDirty && this.tabs.isValid;
  }

  createPortTab(portConfig) {
    if (portConfig.port_type == 'serial' || portConfig.port_type === undefined) {
      return new Tab(
        'port',
        getPortData(portConfig),
        this.portSchemaMap['serial'],
        makeSerialPortTabName
      );
    }
    if (portConfig.port_type == 'tcp') {
      return new Tab(
        'port',
        getPortData(portConfig),
        this.portSchemaMap['tcp'],
        makeTcpPortTabName
      );
    }
    if (portConfig.port_type == 'modbus tcp') {
      return new Tab(
        'port',
        getPortData(portConfig),
        this.portSchemaMap['modbus tcp'],
        makeModbusTcpPortTabName
      );
    }
    return undefined;
  }

  createDeviceTab(deviceConfig) {
    return new Tab(
      'device',
      deviceConfig,
      this.deviceSchemaMap[deviceConfig?.device_type || deviceConfig?.protocol || 'modbus'],
      makeDeviceTabName
    );
  }

  async load() {
    try {
      this.loaded = false;
      const { config, schema } = await this.loadConfigFn();
      this.portSchemaMap = makePortSchemaMap(schema);
      this.deviceSchemaMap = makeDeviceSchemaMap(schema);
      config.ports.forEach(port => {
        const portTab = this.createPortTab(port);
        if (portTab === undefined) {
          return;
        }
        this.tabs.addTab(portTab, true);
        port.devices.forEach(device => {
          this.tabs.addTab(this.createDeviceTab(device), true);
        });
      });
      this.pageWrapperStore.clearError();
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
        Object.entries(this.portSchemaMap).map(([portType, schema]) => {
          return { title: getTranslation(schema.title, schema.translations), value: portType };
        })
      );
    } catch (err) {
      if (err == 'cancel') {
        return;
      }
    }
    let tab = this.createPortTab(getDefaultObject(this.portSchemaMap[newPortType]));
    this.tabs.addTab(tab);
  }

  async showDeleteConfirmModal() {
    return this.confirmModalState.show(
      i18n.t('device-manager.labels.confirm-delete', {
        item: this.tabs.items[this.tabs.selectedTabIndex].name,
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
    try {
      newDeviceType = await this.selectModalState.show(
        i18n.t('device-manager.labels.add-device', { port: this.tabs.selectedPortTab.name }),
        i18n.t('device-manager.buttons.add-device'),
        Object.entries(this.deviceSchemaMap)
          .filter(([deviceType, schema]) => {
            return !schema?.options?.wb?.hide_from_selection;
          })
          .map(([deviceType, schema]) => {
            return { title: getTranslation(schema.title, schema.translations), value: deviceType };
          })
      );
    } catch (err) {
      if (err == 'cancel') {
        return;
      }
    }
    let tab = this.createDeviceTab(getDefaultObject(this.deviceSchemaMap[newDeviceType]));
    this.tabs.addTab(tab);
  }

  makeConfigJson() {
    let config = { ports: [] };
    let lastPort = undefined;
    this.tabs.items.forEach(tab => {
      if (tab.type == 'port') {
        if (lastPort !== undefined) {
          config.ports.push(lastPort);
        }
        lastPort = cloneDeep(tab.editedData);
        lastPort.devices = [];
      } else {
        if (lastPort !== undefined) {
          lastPort.devices.push(cloneDeep(tab.editedData));
        }
      }
    });
    if (lastPort !== undefined) {
      config.ports.push(lastPort);
    }
    return config;
  }

  async save() {
    this.pageWrapperStore.setLoading(true);
    this.pageWrapperStore.clearError();
    try {
      await this.saveConfigFn(this.makeConfigJson());
      this.tabs.submit();
    } catch (err) {
      if (err.data === 'EditorError' && err.code === CONFED_WRITE_FILE_ERROR) {
        this.pageWrapperStore.setError(i18n.t('device-manager.errors.write'));
      } else {
        this.pageWrapperStore.setError(err.message);
      }
    }
    this.pageWrapperStore.setLoading(false);
  }
}

export default DeviceManagerPageStore;
