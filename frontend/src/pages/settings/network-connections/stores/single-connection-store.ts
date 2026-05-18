import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { action, observable, makeObservable, computed } from 'mobx';
import { ConnectionState, NetworkType } from './types';

export class SingleConnection {
  public name = '';
  public state: ConnectionState = ConnectionState.unknown;
  public schema = {};
  public data: any = {};
  public editedData: any = {};
  public isDirty = false;
  public editedConnectionId = '';
  public connectivity = false;
  public operator = '';
  public signalQuality = 0;
  public accessTechnologies = '';
  public hasValidationErrors = false;

  constructor(schema: any, data: any, state: ConnectionState) {
    this.schema = schema;
    this.editedData = data;
    this.data = data;
    this.editedConnectionId = data.connection_id;

    if ([
      NetworkType.Wifi,
      NetworkType.Modem,
      NetworkType.Ethernet,
      NetworkType.WifiAp,
      NetworkType.Can,
    ].includes(data.type)) {
      if (state) {
        this.state = state;
      } else {
        if (data.type !== NetworkType.Can) {
          this.state = ConnectionState['not-connected'];
        }
      }
    } else {
      this.state = ConnectionState.deprecated;
    }
    this.updateName();
    makeObservable(this, {
      name: observable,
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

  setState(newState: ConnectionState) {
    this.state = ConnectionState[newState] || 'not-connected';
  }

  setConnectivity(connectivity: boolean) {
    this.connectivity = connectivity;
  }

  setOperator(operator: string) {
    this.operator = operator;
  }

  setSignalQuality(signalQuality: number) {
    this.signalQuality = signalQuality;
  }

  setAccessTechnologies(accessTechnologies: string) {
    this.accessTechnologies = accessTechnologies;
  }

  setEditedData(data: any, errors: string[]) {
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

  setConnectionId(id: string) {
    if (this.editedConnectionId === id) {
      return;
    }
    this.editedData.connection_id = id;
    this.editedConnectionId = id;
    this.updateName();
    this.isDirty = !isEqual(this.editedData, this.data);
  }

  setUuid(uuid: string) {
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
        this.state = ConnectionState['not-connected'];
      }
    } else if (this.data.type === 'can') {
      this.state = ConnectionState.unknown;
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

export function getConnectionJson(connection: any) {
  let res = cloneDeep(connection);
  delete res.data;
  return res;
}

export function makeConnectionSchema(type: NetworkType, fullSchema: any) {
  const types = new Map<NetworkType, string>([
    [NetworkType.Ethernet, 'nm_ethernet'],
    [NetworkType.Modem, 'nm_modem'],
    [NetworkType.Wifi, 'nm_wifi'],
    [NetworkType.WifiAp, 'nm_wifi_ap'],
    [NetworkType.Can, 'old_can'],
    [NetworkType.Loopback, 'old_loopback'],
    [NetworkType.Static, 'old_static'],
    [NetworkType.Dhcp, 'old_dhcp'],
    [NetworkType.Ppp, 'old_ppp'],
    [NetworkType.Manual, 'old_manual'],
  ]);

  let schema = cloneDeep(fullSchema.definitions[types.get(type)]);
  schema.definitions = fullSchema.definitions;
  schema.translations = fullSchema.translations;
  if (Object.hasOwn(schema, 'allOf')) {
    let dataSchema = { properties: { data: fullSchema.properties.data } };
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
