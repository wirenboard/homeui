import { makeAutoObservable, reaction, runInAction } from 'mobx';
import i18n from '~/i18n/react/config';
import { BooleanStore } from '~/react-directives/forms/boolean-store';
import { NumberStore } from '~/react-directives/forms/number-store';
import { StringStore } from '~/react-directives/forms/string-store';
import { type Tier, TierLevel } from '../components/switcher/types';
import { type Connections } from '../stores/connections-store';
import { type SingleConnection } from '../stores/single-connection-store';
import { NetworkType } from '../stores/types';

const DefaultConnectionPriorities = {
  [NetworkType.Ethernet]: TierLevel.High,
  [NetworkType.Wifi]: TierLevel.Medium,
  [NetworkType.Modem]: TierLevel.Low,
};

function getTierByType(connectionType: NetworkType) {
  return DefaultConnectionPriorities[connectionType];
}

function makeTier(name: any, id: TierLevel): Tier {
  return { name, connections: [], id };
}

function makeTiers(): Tier[] {
  return [
    makeTier(i18n.t('network-connections.labels.high'), TierLevel.High),
    makeTier(i18n.t('network-connections.labels.medium'), TierLevel.Medium),
    makeTier(i18n.t('network-connections.labels.low'), TierLevel.Low),
  ];
}

function manageableBySwitcher(connection: SingleConnection) {
  return (
    Object.keys(DefaultConnectionPriorities).includes(connection.data.type)
     && connection.editedData.ipv4.method !== 'shared'
     && connection.editedData.connection_autoconnect
  );
}

function removeFromArray(array: SingleConnection[], item: SingleConnection) {
  const itemIndex = array.findIndex((el) => el === item);
  if (itemIndex === -1) {
    return false;
  }
  array.splice(itemIndex, 1);
  return true;
}

function copyTiers(src: Tier[], dst: Tier[]) {
  src.forEach((tier, index) => {
    dst[index].connections = [];
    tier.connections.forEach((item) => dst[index].connections.push(item));
  });
}

function getConnectionsManageableBySwitcher(connectionsStore: Connections) {
  return connectionsStore.connections.filter((item) => manageableBySwitcher(item));
}

function updateTiers(connections: SingleConnection[], connectionPrioritiesStore: ConnectionPrioritiesStore) {
  let res = {};
  connections.forEach((cn) => {
    const tier = connectionPrioritiesStore.tiers.find((t) => t.connections.includes(cn));
    const id = tier ? tier.id : getTierByType(cn.data.type);
    if (!Object.hasOwn(res, id)) {
      res[id] = [];
    }
    res[id].push(cn);
  });
  runInAction(() => {
    let isChanged = false;
    connectionPrioritiesStore.tiers.forEach((t) => {
      const newConnections = res[t.id] || [];
      if (t.connections.length !== newConnections.length) {
        t.connections = newConnections;
        isChanged = true;
      }
    });
    if (isChanged) {
      connectionPrioritiesStore.submit();
    }
  });
}

export class ConnectionPrioritiesStore {
  public tiers: Tier[];
  public storedTiers: Tier[];
  public isDirty = false;

  constructor(connectionsStore: Connections) {
    this.tiers = makeTiers();
    this.storedTiers = makeTiers();

    reaction(
      () => getConnectionsManageableBySwitcher(connectionsStore),
      (connections) => updateTiers(connections, this)
    );
    makeAutoObservable(this);
  }

  moveConnectionToTier(connection: SingleConnection, tier: Tier) {
    if (!tier.connections.includes(connection)) {
      this.tiers.some((tier) => removeFromArray(tier.connections, connection));
      tier.connections.push(connection);
      this.isDirty = true;
    }
  }

  submit() {
    copyTiers(this.tiers, this.storedTiers);
    this.isDirty = false;
  }

  reset() {
    copyTiers(this.storedTiers, this.tiers);
    this.isDirty = false;
  }
}

export class SwitcherStore {
  public connectionPriorities: ConnectionPrioritiesStore;
  public urlProperties: any;
  public connectivityUrl: StringStore;
  public connectivityPayload: StringStore;
  public debug: BooleanStore;
  public stickyConnectionPeriod: NumberStore;

  constructor(connectionsStore: Connections) {
    this.stickyConnectionPeriod = new NumberStore({
      type: 'integer',
      name: i18n.t('network-connections.labels.sticky-connection-period'),
      description: i18n.t('network-connections.labels.sticky-connection-period-desc'),
      defaultText: i18n.t('network-connections.labels.sticky-connection-period-default-text'),
      min: 0,
    });

    this.connectivityUrl = new StringStore({
      name: i18n.t('network-connections.labels.connectivity-url'),
      description: i18n.t('network-connections.labels.connectivity-url-desc'),
      defaultText: i18n.t('network-connections.labels.connectivity-url-default-text'),
      validator: (value) => {
        if (value !== '') {
          if (value.length < this.urlProperties.minLength) {
            return i18n.t('network-connections.labels.connectivity-url-error-length', {
              length: this.urlProperties.minLength,
            });
          }
          if (!(value.startsWith('http://') || value.startsWith('https://'))) {
            return i18n.t('network-connections.labels.connectivity-url-error-format');
          }
        }
        return false;
      },
    });

    this.connectivityPayload = new StringStore({
      name: i18n.t('network-connections.labels.connectivity-payload'),
      description: i18n.t('network-connections.labels.connectivity-payload-desc'),
      defaultText: i18n.t('network-connections.labels.connectivity-payload-default-text'),
    });

    this.debug = new BooleanStore({
      name: i18n.t('network-connections.labels.debug'),
    });

    this.connectionPriorities = new ConnectionPrioritiesStore(connectionsStore);
  }

  setSchemaProperties(schemaProperties: any) {
    this.urlProperties = schemaProperties.connectivity_check_url;
    this.stickyConnectionPeriod.setDefaultText(schemaProperties.sticky_connection_period_s.default);
    this.connectivityUrl.setDefaultText(schemaProperties.connectivity_check_url.default);
    this.connectivityPayload.setDefaultText(schemaProperties.connectivity_check_payload.default);
  }

  submit() {
    return Object.entries(this).forEach(([_k, v]) => v.submit?.());
  }

  reset() {
    return Object.entries(this).forEach(([_k, v]) => v.reset?.());
  }

  get isDirty() {
    return Object.entries(this).some(([_k, v]) => v?.isDirty);
  }

  get hasErrors() {
    return Object.entries(this).some(([_k, v]) => v.hasErrors);
  }
}

export function switcherStoreToJson(store: SwitcherStore, connectionsToStore: SingleConnection[]) {
  let res: any = {};
  // @ts-ignore
  if (store.stickyConnectionPeriod.value !== '') {
    res.sticky_connection_period_s = store.stickyConnectionPeriod.value;
  }
  if (!store.connectivityUrl.hasErrors && store.connectivityUrl.value !== '') {
    res.connectivity_check_url = store.connectivityUrl.value;
  }
  if (store.connectivityPayload.value !== '') {
    res.connectivity_check_payload = store.connectivityPayload.value;
  }
  if (store.debug.value) {
    res.debug = store.debug.value;
  }
  res.tiers = {};
  store.connectionPriorities.tiers.forEach((tier) => {
    res.tiers[tier.id] = tier.connections
      .filter((cn) => connectionsToStore.includes(cn))
      .map((cn) => cn.name);
  });
  return res;
}

export function switcherStoreFromJson(store: SwitcherStore, json: any, connectionsStore: Connections) {
  store.stickyConnectionPeriod.setValue(json.sticky_connection_period_s);
  store.stickyConnectionPeriod.submit();
  store.connectivityUrl.setValue(json.connectivity_check_url);
  store.connectivityUrl.submit();
  store.connectivityPayload.setValue(json.connectivity_check_payload);
  store.connectivityPayload.submit();
  store.debug.setValue(json.debug);
  store.debug.submit();

  const manageableConnections = getConnectionsManageableBySwitcher(connectionsStore);
  store.connectionPriorities.tiers.forEach((tier) => {
    tier.connections = [];
    (json?.tiers?.[tier.id] ?? []).forEach((name: string) => {
      const cn = manageableConnections.find((item) => item.name === name);
      if (cn) {
        tier.connections.push(cn);
      }
    });
  });
  store.connectionPriorities.submit();
  updateTiers(manageableConnections, store.connectionPriorities);
}
