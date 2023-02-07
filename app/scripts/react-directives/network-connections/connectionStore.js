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
  active = false;
  editedConnectionId = '';
  connectivity = false;
  _onSwitchState = undefined;
  _hasValidationErrors = false;

  constructor(schema, data, index, state, onSwitchState) {
    this.id = index;
    this.schema = schema;
    this.editedData = data;
    this.data = data;
    this.editedConnectionId = data.connection_id;
    this._onSwitchState = onSwitchState;
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
      editedConnectionId: observable,
      connectivity: observable,
      _hasValidationErrors: observable,
      description: computed,
      isNew: computed,
      managedByNM: computed,
      isDeprecated: computed,
      allowSwitchState: computed,
      hasErrors: computed,
      setState: action,
      setConnectivity:action,
      setEditedData: action.bound,
      activate: action,
      deactivate: action,
      commit: action,
      rollback: action,
      updateName: action,
      switchState: action,
      setConnectionId: action,
    });
  }

  get description() {
    if (this.state === 'unknown') {
      return '';
    }
    if (this.state === 'activated' && !this.connectivity) {
      return 'network-connections.labels.limited-connectivity';
    }
    return 'network-connections.labels.' + this.state;
  }

  get isNew() {
    return this.state === 'new';
  }

  get managedByNM() {
    return this.data.type !== 'can' && !this.isDeprecated;
  }

  get isDeprecated() {
    return this.state === 'deprecated';
  }

  get allowSwitchState() {
    return !this.isNew && ['activated', 'not-connected'].includes(this.state);
  }

  get hasErrors() {
    return this._hasValidationErrors || (this.managedByNM && !this.editedConnectionId);
  }

  switchState() {
    if (this.state === 'activated') {
      this.state = 'deactivating';
    } else {
      if (this.state === 'not-connected') {
        this.state = 'activating';
      }
    }
    this?._onSwitchState(this.data.connection_uuid);
  }

  updateName() {
    if (this.isNew) {
      this.name = this.editedConnectionId || this.editedData.name || '';
    } else {
      this.name = this.data.connection_id || this.data.name || '';
    }
  }

  setState(newState) {
    const states = ['activated', 'activating', 'deactivating'];
    this.state = states.find(state => state == newState) || 'not-connected';
  }

  setConnectivity(connectivity) {
    this.connectivity = connectivity;
  }

  setEditedData(data, errors) {
    if (this.managedByNM) {
      if (['03_nm_wifi', '04_nm_wifi_ap'].includes(this.editedData.type)) {
        const ssid = data['802-11-wireless_ssid'];
        if (
          this.isNew &&
          ssid &&
          (!this.editedData['802-11-wireless_ssid'] ||
            this.editedData['802-11-wireless_ssid'] === this.editedData.connection_id)
        ) {
          this.editedConnectionId = ssid;
        }
      }
      data.connection_id = this.editedConnectionId;
    }
    this.editedData = cloneDeep(data);
    this.updateName();
    this.isChanged = !isEqual(this.editedData, this.data);
    this._hasValidationErrors = Boolean(errors.length);
  }

  setConnectionId(id) {
    if (this.editedConnectionId === id) {
      return;
    }
    this.editedData.connection_id = id;
    this.editedConnectionId = id;
    this.updateName();
    this.isChanged = !isEqual(this.editedData, this.data);
  }

  commit() {
    this.data = cloneDeep(this.editedData);
    this.updateName();
    this.isChanged = false;
    this._hasValidationErrors = false;
    if (this.managedByNM) {
      this.state = 'not-connected';
    } else if (this.data.type === 'can') {
      this.state = 'unknown';
    }
  }

  rollback() {
    // Trigger update and components re-render
    this.data = cloneDeep(this.data);
    this.editedData = cloneDeep(this.data);
    this.editedConnectionId = this.data.connection_id;
    this.updateName();
    this.isChanged = false;
    this._hasValidationErrors = false;
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
  delete schema.definitions.nm_connection.properties.connection_id.minLength;

  return schema;
}
