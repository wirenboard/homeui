'use strict';

import { action, observable, makeObservable, computed } from 'mobx';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';

export class SingleConnection {
  name = '';
  // "activated"
  // "activating"
  // "deactivating"
  // "not-connected"
  // "deprecated"
  // "new"
  // "unknown"
  // "deactivating-by-cm"
  // "deactivated-by-cm"
  state = 'unknown';
  icon = '';
  schema = {};
  data = {};
  editedData = {};
  isDirty = false;
  editedConnectionId = '';
  connectivity = false;
  operator = '';
  signalQuality = 0;
  accessTechnologies = '';
  hasValidationErrors = false;

  constructor(schema, data, state) {
    this.schema = schema;
    this.editedData = data;
    this.data = data;
    this.editedConnectionId = data.connection_id;
    const typeToIcon = {
      '01_nm_ethernet': 'fas fa-network-wired',
      '02_nm_modem': 'fas fa-signal',
      '03_nm_wifi': 'fas fa-wifi',
      '04_nm_wifi_ap': 'wbi wifi-ap',
      can: 'can-bus',
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
      isDirty: observable,
      data: observable,
      editedData: observable,
      editedConnectionId: observable,
      connectivity: observable,
      operator: observable,
      signalQuality: observable,
      accessTechnologies: observable,
      hasValidationErrors: observable,
      description: computed,
      isNew: computed,
      managedByNM: computed,
      isDeprecated: computed,
      allowSwitchState: computed,
      withAutoconnect: computed,
      hasErrors: computed,
      setState: action,
      setConnectivity: action,
      setOperator: action,
      setSignalQuality: action,
      setAccessTechnologies: action,
      setEditedData: action.bound,
      submit: action,
      reset: action,
      updateName: action,
      setConnectionId: action,
    });
  }

  get description() {
    if (this.state === 'unknown') {
      return '';
    }
    if (this.state === 'activated' && !this.connectivity && this.data.type !== '04_nm_wifi_ap') {
      return 'network-connections.labels.limited-connectivity';
    }
    return 'network-connections.labels.' + this.state;
  }

  get withAutoconnect() {
    return this.isDeprecated || this.data.type === 'can'
      ? this.data.auto
      : this.data.connection_autoconnect;
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
    return !this.isNew && ['activated', 'not-connected', 'deactivated-by-cm'].includes(this.state);
  }

  get hasErrors() {
    return this.hasValidationErrors || (this.managedByNM && !this.editedConnectionId);
  }

  updateName() {
    if (this.isNew) {
      this.name = this.editedConnectionId || this.editedData.name || '';
    } else {
      this.name = this.data.connection_id || this.data.name || '';
    }
  }

  setState(newState) {
    const states = {
      activated: 'activated',
      activating: 'activating',
      deactivating: 'deactivating',
      'deactivating by wb-connection-manager': 'deactivating-by-cm',
      'deactivated by wb-connection-manager': 'deactivated-by-cm',
    };
    this.state = states[newState] || 'not-connected';
  }

  setConnectivity(connectivity) {
    this.connectivity = connectivity;
  }

  setOperator(operator) {
    this.operator = operator;
  }

  setSignalQuality(signalQuality) {
    this.signalQuality = signalQuality;
  }

  setAccessTechnologies(accessTechnologies) {
    this.accessTechnologies = accessTechnologies;
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
    this.isDirty = !isEqual(this.editedData, this.data);
    this.hasValidationErrors = Boolean(errors.length);
  }

  setConnectionId(id) {
    if (this.editedConnectionId === id) {
      return;
    }
    this.editedData.connection_id = id;
    this.editedConnectionId = id;
    this.updateName();
    this.isDirty = !isEqual(this.editedData, this.data);
  }

  setUuid(uuid) {
    if (this.managedByNM) {
      this.data.connection_uuid = uuid;
    }
  }

  submit() {
    this.data = cloneDeep(this.editedData);
    this.updateName();
    this.isDirty = false;
    this.hasValidationErrors = false;
    if (this.managedByNM) {
      if (this.isNew) {
        this.state = 'not-connected';
      }
    } else if (this.data.type === 'can') {
      this.state = 'unknown';
    }
  }

  reset() {
    // Trigger update and components re-render
    this.data = cloneDeep(this.data);
    this.editedData = cloneDeep(this.data);
    this.editedConnectionId = this.data.connection_id;
    this.updateName();
    this.isDirty = false;
    this.hasValidationErrors = false;
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
