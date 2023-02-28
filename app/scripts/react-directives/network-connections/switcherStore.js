'use strict';

import { makeAutoObservable, reaction, runInAction } from 'mobx';
import i18n from '../../i18n/react/config';
import { IntegerStore } from './numberStore';
import { StringStore } from './stringStore';
import { BooleanStore } from './booleanStore';
import { createViewModel } from 'mobx-utils';

export const HIGH_TIER = 'high';
export const MEDIUM_TIER = 'medium';
export const LOW_TIER = 'low';

const DefaultConnectionPriorities = {
  '01_nm_ethernet': HIGH_TIER,
  '03_nm_wifi': MEDIUM_TIER,
  '02_nm_modem': LOW_TIER,
};

export function getTierByType(connectionType) {
  return DefaultConnectionPriorities[connectionType];
}

function makeTier(name, id) {
  return { name, connections: [], id };
}

function makeTiers() {
  return [
    makeTier(i18n.t('network-connections.labels.high'), HIGH_TIER),
    makeTier(i18n.t('network-connections.labels.medium'), MEDIUM_TIER),
    makeTier(i18n.t('network-connections.labels.low'), LOW_TIER),
  ];
}

function managableBySwitcher(connection) {
  return (
    Object.keys(DefaultConnectionPriorities).includes(connection.data.type) &&
    connection.editedData.connection_autoconnect
  );
}

function removeFromArray(array, item) {
  const itemIndex = array.findIndex(el => el === item);
  if (itemIndex === -1) {
    return false;
  }
  array.splice(itemIndex, 1);
  return true;
}

function copyTiers(src, dst) {
  src.forEach((tier, index) => {
    dst[index].connections = [];
    tier.connections.forEach(item => dst[index].connections.push(item));
  });
}

function getConnectionsManagableBySwitcher(connectionsStore) {
  return connectionsStore.connections.filter(item => managableBySwitcher(item));
}

function updateTiers(connections, connectionPrioritiesStore) {
  var res = {};
  connections.forEach(cn => {
    const tier = connectionPrioritiesStore.tiers.find(t => t.connections.includes(cn));
    const id = tier ? tier.id : getTierByType(cn.data.type);
    if (!res.hasOwnProperty(id)) {
      res[id] = [];
    }
    res[id].push(cn);
  });
  runInAction(() => {
    let isChanged = false;
    connectionPrioritiesStore.tiers.forEach(t => {
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

class ConnectionPrioritiesStore {
  constructor(connectionsStore) {
    this.tiers = makeTiers();
    this.storedTiers = makeTiers();
    this.isDirty = false;

    reaction(
      () => getConnectionsManagableBySwitcher(connectionsStore),
      connections => updateTiers(connections, this)
    );
    makeAutoObservable(this);
  }

  moveConnectionToTier(connection, tier) {
    if (!tier.connections.includes(connection)) {
      this.tiers.some(tier => removeFromArray(tier.connections, connection));
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

class SwitcherStore {
  constructor(connectionsStore) {
    this.stickySimPeriod = createViewModel(
      new IntegerStore({
        name: i18n.t('network-connections.labels.sticky-sim-period'),
        description: i18n.t('network-connections.labels.sticky-sim-period-desc'),
        placeholder: i18n.t('network-connections.labels.sticky-sim-period-placeholder'),
        min: 0,
      })
    );

    this.connectivityUrl = createViewModel(
      new StringStore({
        name: i18n.t('network-connections.labels.connectivity-url'),
        description: i18n.t('network-connections.labels.connectivity-url-desc'),
        placeholder: i18n.t('network-connections.labels.connectivity-url-placeholder'),
      })
    );

    this.connectivityPayload = createViewModel(
      new StringStore({
        name: i18n.t('network-connections.labels.connectivity-payload'),
        description: i18n.t('network-connections.labels.connectivity-payload-desc'),
        placeholder: i18n.t('network-connections.labels.connectivity-payload-placeholder'),
      })
    );

    this.debug = createViewModel(
      new BooleanStore({
        name: i18n.t('network-connections.labels.debug'),
        id: 'switcher-debug',
      })
    );

    this.connectionPriorities = new ConnectionPrioritiesStore(connectionsStore);
  }

  submit() {
    return Object.entries(this).forEach(([k, v]) => v.submit?.());
  }

  reset() {
    return Object.entries(this).forEach(([k, v]) => v.reset?.());
  }

  get isDirty() {
    return Object.entries(this).some(([k, v]) => v.isDirty);
  }

  get hasErrors() {
    return Object.entries(this).some(([k, v]) => v.hasErrors);
  }
}

export function switcherStoreToJson(store, connectionsToStore) {
  let res = {};
  if (store.stickySimPeriod.value !== '') {
    res.sticky_sim_period_s = store.stickySimPeriod.value;
  }
  if (store.connectivityUrl.value !== '') {
    res.connectivity_check_url = store.connectivityUrl.value;
  }
  if (store.connectivityPayload.value !== '') {
    res.connectivity_check_payload = store.connectivityPayload.value;
  }
  if (store.debug.value) {
    res.debug = store.debug.value;
  }
  res.tiers = {};
  store.connectionPriorities.tiers.forEach(tier => {
    res.tiers[tier.id] = tier.connections
      .filter(cn => connectionsToStore.includes(cn))
      .map(cn => cn.name);
  });
  return res;
}

export function switcherStoreFromJson(store, json, connectionsStore) {
  store.stickySimPeriod.setValue(json.sticky_sim_period_s);
  store.stickySimPeriod.submit();
  store.connectivityUrl.setValue(json.connectivity_check_url);
  store.connectivityUrl.submit();
  store.connectivityPayload.setValue(json.connectivity_check_payload);
  store.connectivityPayload.submit();
  store.debug.setValue(json.debug);
  store.debug.submit();

  const managableConnections = getConnectionsManagableBySwitcher(connectionsStore);
  store.connectionPriorities.tiers.forEach(tier => {
    tier.connections = [];
    (json?.tiers?.[tier.id] ?? []).forEach(name => {
      const cn = managableConnections.find(item => item.name === name);
      if (cn) {
        tier.connections.push(cn);
      }
    });
  });
  store.connectionPriorities.submit();
  updateTiers(managableConnections, store.connectionPriorities);
}

export default SwitcherStore;
