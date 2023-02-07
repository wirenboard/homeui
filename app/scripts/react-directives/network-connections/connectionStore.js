import {
  action, observable, makeObservable, computed,
} from 'mobx';
import { isEqual, cloneDeep } from 'lodash';

export class Connection {
  name = '';

  icon = '';

  schema = {};

  data = {};

  editedData = {};

  isDeprecated = false;

  isChanged = false;

  editedConnectionId = '';

  hasValidationErrors = false;

  constructor(schema, data) {
    this.schema = schema;
    this.editedData = data;
    this.data = data;
    this.editedConnectionId = data.connection_id;
    const typeToIcon = {
      '01_nm_ethernet': 'fas fa-network-wired',
      '02_nm_modem': 'fas fa-signal',
      '03_nm_wifi': 'fas fa-wifi',
      '04_nm_wifi_ap': 'fas fa-wifi',
      can: 'fas fa-bars',
    };
    if (typeToIcon.hasOwnProperty(data.type)) {
      this.icon = typeToIcon[data.type];
    } else {
      this.icon = 'glyphicon glyphicon-exclamation-sign';
      this.isDeprecated = true;
    }
    this.updateName();
    makeObservable(this, {
      name: observable,
      isChanged: observable,
      isDeprecated: observable,
      data: observable,
      editedConnectionId: observable,
      hasValidationErrors: observable,
      description: computed,
      isNew: computed,
      managedByNM: computed,
      allowSwitchState: computed,
      hasErrors: computed,
      setEditedData: action.bound,
      commit: action,
      rollback: action,
      updateName: action,
      setConnectionId: action,
    });
  }

  get connectionId() {
    return this.editedConnectionId;
  }

  get isNew() {
    return false;
  }

  get description() {
    return this.state === 'unknown' ? '' : `network-connections.labels.${this.state}`;
  }

  get managedByNM() {
    return this.data.type !== 'can' && !this.isDeprecated;
  }

  get allowSwitchState() {
    return !this.isNew && ['activated', 'not-connected'].includes(this.state);
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

  setEditedData(data, errors, isNew) {
    if (this.managedByNM) {
      if (['03_nm_wifi', '04_nm_wifi_ap'].includes(this.editedData.type)) {
        const ssid = data['802-11-wireless_ssid'];
        if (
          isNew
          && ssid
          && (!this.editedData['802-11-wireless_ssid']
            || this.editedData['802-11-wireless_ssid'] === this.editedData.connection_id)
        ) {
          this.editedConnectionId = ssid;
        }
      }
      data.connection_id = this.editedConnectionId;
    }
    this.editedData = cloneDeep(data);
    this.updateName();
    this.isChanged = !isEqual(this.editedData, this.data);
    this.hasValidationErrors = Boolean(errors.length);
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
    this.hasValidationErrors = false;
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
    this.hasValidationErrors = false;
  }
}

export function getConnectionJson(connection) {
  const res = cloneDeep(connection);
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
  const schema = cloneDeep(fullSchema.definitions[types.get(type)]);
  schema.definitions = fullSchema.definitions;
  schema.translations = fullSchema.translations;
  if (schema.hasOwnProperty('allOf')) {
    const dataSchema = { properties: { data: fullSchema.properties.data } };
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
