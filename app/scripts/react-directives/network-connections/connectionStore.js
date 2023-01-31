'use strict';

import { action, observable, makeObservable, computed } from 'mobx';
import { isEqual, cloneDeep } from 'lodash';

export class Connection {
  id = 0;
  name = '';
  // "activated"
  // "activating"
  // "deactivating"
  // "not-connected"
  // "deprecated"
  // "new"
  // "unknown"
  state = 'unknown';
  icon = '';
  schema = {};
  data = {};
  editedData = {};
  isChanged = false;
  hasErrors = false;
  active = false;

  constructor(schema, data, index, state) {
    this.id = index;
    this.schema = schema;
    this.editedData = data;
    this.data = data;
    const typeToIcon = {
      '01_nm_ethernet': 'fas fa-network-wired',
      '02_nm_modem': 'fas fa-signal',
      '03_nm_wifi': 'fas fa-wifi',
      '04_nm_wifi_ap': 'fas fa-wifi',
      can: 'fas fa-bars',
    };
    if (typeToIcon.hasOwnProperty(data.type)) {
      this.icon = typeToIcon[data.type];
      if (state) {
        this.state = state;
      } else {
        if (data.type != 'can') {
          this.state = 'not-connected';
        }
      }
    } else {
      this.icon = 'glyphicon glyphicon-exclamation-sign';
      this.state = 'deprecated';
    }
    this.updateName();
    makeObservable(this, {
      name: observable,
      description: observable,
      state: observable,
      isChanged: observable,
      data: observable,
      active: observable,
      hasErrors: observable,
      description: computed,
      isNew: computed,
      setState: action,
      setEditedData: action.bound,
      activate: action,
      deactivate: action,
      commit: action,
      rollback: action,
      updateName: action,
    });
  }

  get description() {
    return this.state === 'unknown' ? '' : 'network-connections.labels.' + this.state;
  }

  get isNew() {
    return this.state === 'new';
  }

  updateName() {
    if (this.isNew) {
      this.name = this.editedData.connection_id || this.editedData.name || '';
    } else {
      this.name = this.data.connection_id || this.data.name || '';
    }
  }

  setState(newState) {
    const states = ['activated', 'activating', 'deactivating'];
    this.state = states.find(state => state == newState) || 'not-connected';
  }

  setEditedData(data, errors) {
    this.editedData = cloneDeep(data);
    this.updateName();
    this.isChanged = !isEqual(this.editedData, this.data);
    this.hasErrors = Boolean(errors.length);
  }

  commit() {
    this.data = cloneDeep(this.editedData);
    this.updateName();
    this.isChanged = false;
    this.hasErrors = false;
    if (this.data.type != 'can' && this.state !== 'deprecated') {
      this.state = 'not-connected';
    }
  }

  rollback() {
    // Trigger update and components re-render
    this.data = cloneDeep(this.data);
    this.updateName();
    this.isChanged = false;
    this.hasErrors = false;
  }

  activate() {
    this.active = true;
  }

  deactivate() {
    this.active = false;
  }
}

export function getConnectionJson(connection) {
  var res = cloneDeep(connection);
  delete res.data;
  return res;
}

export function getNewConnection(type) {
  if (type === 'can') {
    return { type: type, 'allow-hotplug': true, auto: false, options: { bitrate: 12500 } };
  }
  return { type: type, connection_uuid: '', connection_id: '' };
}

export function makeConnectionSchema(type, fullSchema) {
  const types = new Map([
    ['01_nm_ethernet', 'nm_ethernet'],
    ['02_nm_modem', 'nm_modem'],
    ['03_nm_wifi', 'nm_wifi'],
    ['04_nm_wifi_ap', 'nm_wifi_ap'],
    ['can', 'old_can'],
    ['loopback', 'old_loopback'],
    ['static', 'old_static'],
    ['dhcp', 'old_dhcp'],
    ['ppp', 'old_ppp'],
    ['manual', 'old_manual'],
  ]);
  var schema = cloneDeep(fullSchema.definitions[types.get(type)]);
  schema.definitions = fullSchema.definitions;
  schema.translations = fullSchema.translations;
  if (schema.hasOwnProperty('allOf')) {
    var dataSchema = { properties: { data: fullSchema.properties.data } };
    schema.allOf.push(dataSchema);
  } else {
    schema.properties = schema.properties || {};
    schema.properties.data = fullSchema.properties.data;
  }
  schema.options = schema.options || {};
  schema.options.wb = schema.options.wb || {};
  schema.options.wb.disable_title = true;

  return schema;
}
