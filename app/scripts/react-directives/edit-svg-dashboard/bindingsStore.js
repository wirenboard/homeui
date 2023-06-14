'use strict';

import { makeAutoObservable, makeObservable, observable, action } from 'mobx';
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

const addStringValueStore = (formStore) => {
  formStore.add(
    'value',
    new StringStore({
      name: i18n.t('edit-svg-dashboard.labels.value'),
      validator: makeNotEmptyValidator(),
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
  addStringValueStore(res);
  return res;
};

const makeStyleBindingStore = devices => {
  let res = new FormStore();
  addEnableStore(res, 'edit-svg-dashboard.labels.style-enable');
  addChannelsStore(res, devices);
  addStringValueStore(res);
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

class SvgElementBindingsStore {
  constructor() {
    this.clearSelection();
    makeAutoObservable(this);
  }

  get isSelected() {
    return !!this.element;
  }

  setSelectedElement(element, id, params, devices) {
    this.clearSelection();
    if (element) {
      element.classList.add('selected');
      this.element = element;
      this.id = id;
      if (this.tagName !== element.tagName) {
        this.params = new FormStore();
        if (element.tagName === 'text') {
          this.params.add('read', makeReadBindingStore(devices));
        }
        this.params.add('write', makeWriteBindingStore(devices));
        this.params.add('style', makeStyleBindingStore(devices));
        this.params.add('visible', makeVisibleBindingStore(devices));
        this.tagName = element.tagName;
      }
      this.params.setValue(cloneDeep(params));
    }
  }

  clearSelection() {
    this.tagName = '';
    this.id = null;
    if (this?.params?.hasProperties) {
      this.params = new FormStore();
    }
    if (this.element) {
      this.element.classList.remove('selected');
    }
    this.element = null;
  }
}

class BindingsStore {
  constructor() {
    this.params = {};
    this.editable = new SvgElementBindingsStore();
    this.jsonEditMode = false;
    this.jsonSource = '';
    this.devices = [];

    makeObservable(this, {
      editable: observable,
      jsonEditMode: observable,
      setJsonSource: action,
      startJsonEditing: action,
      cancelEditingJson: action,
      saveJson: action
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
      console.log(e);
      alert(e);
    }
  }

  setDevices(deviceData, localeId) {
    this.devices = Object.entries(deviceData.devices).map(([deviceId, d]) => {
      let res = {
        label: d.getName(localeId),
        options: d.cellIds.map(c => {
          let cell = deviceData.cells[c];
          if (cell) {
            return {
              value: cell.id,
              label: `${cell.getName(localeId)} [${cell.id}]`,
            };
          }
          return {
            value: 'dummy',
            label: 'dummy',
          };
        }),
      };
      return res;
    });
  }

  onSelectSvgElement(element) {
    this.saveBinding();
    const id = element.getAttribute('data-svg-param-id') || element.getAttribute('id');
    let data = this.params.find(param => param.id === id);
    if (!data) {
        data = {
            id: id
        };
    }
    this.editable.setSelectedElement(element, id, new DashboardSvgParam(data), this.devices);
  }

  saveBinding() {
    if (this.editable.id) {
      let oldData = this.params.find(param => param.id === this.editable.id);
      let res = this.editable.params.value;
      if (oldData) {
        if (res?.write?.enable || res?.read?.enable || res?.style?.enable || res?.visible?.enable) {
          Object.assign(oldData, this.editable.params.value);
        } else {
          this.params = this.params.filter(param => param.id !== this.editable.id)
        }
      } else {
        if (res?.write?.enable || res?.read?.enable || res?.style?.enable || res?.visible?.enable) {
          res.id = this.editable.id;
          this.params.push(res);
        }
      }
    }
  }
}

export default BindingsStore;
