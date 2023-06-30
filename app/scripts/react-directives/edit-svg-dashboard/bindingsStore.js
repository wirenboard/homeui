'use strict';

import { makeAutoObservable, makeObservable, observable, action, reaction, autorun } from 'mobx';
import { FormStore } from '../../react-directives/forms/formStore';
import { BooleanStore } from '../../react-directives/forms/booleanStore';
import { StringStore } from '../../react-directives/forms/stringStore';
import { OptionsStore } from '../../react-directives/forms/optionsStore';
import { cloneDeep } from 'lodash';
import i18n from '../../i18n/react/config';
import { makeNotEmptyValidator } from '../forms/stringValidators';
import DashboardSvgParam from '../../services/dashboardSvgParam';

const addChannelsStore = (formStore, devices) => {
  formStore.add(
    'channel',
    new OptionsStore({
      name: i18n.t('edit-svg-dashboard.labels.channel'),
      placeholder: i18n.t('edit-svg-dashboard.labels.select-channel-placeholder'),
      options: devices,
    })
  );
};

const addStringValueStore = (formStore, description) => {
  formStore.add(
    'value',
    new StringStore({
      name: i18n.t('edit-svg-dashboard.labels.value'),
      validator: makeNotEmptyValidator(),
      description: description,
    })
  );
};

const addEnableStore = (formStore, key) => {
  formStore.add(
    'enable',
    new BooleanStore({
      name: i18n.t(key),
      id: key,
    })
  );
};

const makeWriteBindingStore = devices => {
  let res = new FormStore();
  addEnableStore(res, 'edit-svg-dashboard.labels.write-enable');
  addChannelsStore(res, devices);
  let valueStore = new FormStore();
  valueStore.add(
    'off',
    new StringStore({
      name: i18n.t('edit-svg-dashboard.labels.off'),
      validator: makeNotEmptyValidator(),
    })
  );
  valueStore.add(
    'on',
    new StringStore({
      name: i18n.t('edit-svg-dashboard.labels.on'),
      validator: makeNotEmptyValidator(),
    })
  );
  res.add('value', valueStore);
  return res;
};

const makeReadBindingStore = devices => {
  let res = new FormStore();
  addEnableStore(res, 'edit-svg-dashboard.labels.read-enable');
  addChannelsStore(res, devices);
  addStringValueStore(res, i18n.t('edit-svg-dashboard.labels.read-value-desc'));
  return res;
};

const makeStyleBindingStore = devices => {
  let res = new FormStore();
  addEnableStore(res, 'edit-svg-dashboard.labels.style-enable');
  addChannelsStore(res, devices);
  addStringValueStore(res, i18n.t('edit-svg-dashboard.labels.style-value-desc'));
  return res;
};

const makeVisibleBindingStore = devices => {
  let res = new FormStore();
  addEnableStore(res, 'edit-svg-dashboard.labels.visible-enable');
  addChannelsStore(res, devices);
  res.add(
    'condition',
    new OptionsStore({
      name: i18n.t('edit-svg-dashboard.labels.condition'),
      options: [
        { label: '==', value: '==' },
        { label: '!=', value: '!=' },
        { label: '>', value: '>' },
        { label: '<', value: '<' },
      ],
    })
  );
  addStringValueStore(res);
  return res;
};

const addEnableReaction = (binding, bindingsStore) => {
  return reaction(
    () => binding.params.enable.value,
    value => {
      if (value && !binding.params.channel.value) {
        Object.entries(bindingsStore.params).some(([key, store]) => {
          if (store?.params?.enable?.value) {
            const channel = store?.params?.channel?.value;
            if (channel) {
              binding.params.channel.setValue(channel);
              return true;
            }
          }
          return false;
        });
      }
    }
  );
};

const makeLongPressBindingStore = dashboards => {
  let res = new FormStore();
  addEnableStore(res, 'edit-svg-dashboard.labels.long-press-enable');
  res.add(
    'dashboard',
    new OptionsStore({
      name: i18n.t('edit-svg-dashboard.labels.move-to-dashboard'),
      placeholder: i18n.t('edit-svg-dashboard.labels.select-dashboard-placeholder'),
      options: dashboards,
    })
  );
  return res;
};

class SvgElementBindingsStore {
  constructor() {
    this.tagName = '';
    this.id = null;
    this.element = null;

    makeAutoObservable(this);
    this.paramsStoreDisposers = [];
  }

  get isSelected() {
    return !!this.element;
  }

  makeNewParamsStore() {
    this.paramsStoreDisposers.forEach(disposer => disposer());
    this.paramsStoreDisposers = [];
    this.params = new FormStore();
  }

  addParam(key, store) {
    this.params.add(key, store);
    this.paramsStoreDisposers.push(addEnableReaction(store, this.params));
  }

  setSelectedElement(element, id, params, devices, dashboards) {
    this.clearSelection();
    if (element) {
      element.classList.add('selected');
      this.element = element;
      this.id = id;
      if (this.tagName !== element.tagName) {
        this.makeNewParamsStore();
        if (element.tagName === 'text') {
          this.addParam('read', makeReadBindingStore(devices));
        }
        this.addParam('write', makeWriteBindingStore(devices));
        this.addParam('style', makeStyleBindingStore(devices));
        this.addParam('visible', makeVisibleBindingStore(devices));
        this.params.add('long-press', makeLongPressBindingStore(dashboards));
        this.tagName = element.tagName;
      }
      this.params.setValue(cloneDeep(params));
    }
  }

  clearSelection() {
    this.tagName = '';
    this.id = null;
    if (this?.params?.hasProperties) {
      this.makeNewParamsStore();
    }
    if (this.element) {
      this.element.classList.remove('selected');
    }
    this.element = null;
  }
}

const hasBindings = param => {
  return (
    param?.write?.enable ||
    param.read?.enable ||
    param?.style?.enable ||
    param?.visible?.enable ||
    param['long-press']?.enable
  );
};

class BindingsStore {
  constructor() {
    this.params = {};
    this.editable = new SvgElementBindingsStore();
    this.jsonEditMode = false;
    this.jsonSource = '';
    this.devices = [];
    this.dashboards = [];

    makeObservable(this, {
      editable: observable,
      jsonEditMode: observable,
      setJsonSource: action,
      startJsonEditing: action,
      cancelEditingJson: action,
      saveJson: action,
    });
  }

  setParams(params) {
    this.params = cloneDeep(params);
  }

  setJsonSource(jsonSource) {
    this.jsonSource = jsonSource;
  }

  startJsonEditing() {
    this.jsonSource = JSON.stringify(this.params, null, 2);
    this.jsonEditMode = true;
    this.editable.clearSelection();
  }

  cancelEditingJson() {
    this.jsonEditMode = false;
  }

  saveJson() {
    try {
      this.params = JSON.parse(this.jsonSource);
      this.jsonEditMode = false;
    } catch (e) {
      alert(e);
    }
  }

  setDevices(deviceData, localeId) {
    this.devices = Object.entries(deviceData.devices).map(([deviceId, d]) => ({
      label: d.getName(localeId),
      options: d.cellIds.reduce((cells, c) => {
        let cell = deviceData.cells[c];
        if (cell) {
          cells.push({
            value: cell.id,
            label: `${cell.getName(localeId)} [${cell.id}]`,
          });
        }
        return cells;
      }, []),
    }));
  }

  setDashboards(dashboards) {
    this.dashboards = dashboards;
  }

  onSelectSvgElement(element) {
    this.saveBinding();
    if (element) {
      const id = element.getAttribute('data-svg-param-id') || element.getAttribute('id');
      let data = this.params.find(param => param.id === id);
      if (!data) {
        data = {
          id: id,
        };
      }
      this.editable.setSelectedElement(
        element,
        id,
        new DashboardSvgParam(data),
        this.devices,
        this.dashboards
      );
    } else {
      this.editable.clearSelection();
    }
  }

  saveBinding() {
    if (this.editable.id) {
      let oldData = this.params.find(param => param.id === this.editable.id);
      let res = this.editable.params.value;
      if (oldData) {
        if (hasBindings(res)) {
          Object.assign(oldData, this.editable.params.value);
        } else {
          this.params = this.params.filter(param => param.id !== this.editable.id);
        }
      } else {
        if (hasBindings(res)) {
          res.id = this.editable.id;
          this.params.push(res);
        }
      }
    }
  }
}

export default BindingsStore;
