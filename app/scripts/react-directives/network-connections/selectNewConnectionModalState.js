'use strict';

import i18n from '../../i18n/react/config';
import { makeAutoObservable } from 'mobx';

class SelectNewConnectionModalState {
  id = 'selectNewConnectionModal';
  active = false;
  options = [
    { title: i18n.t('network-connections.labels.ethernet'), value: '01_nm_ethernet' },
    { title: i18n.t('network-connections.labels.wifi'), value: '03_nm_wifi' },
    { title: i18n.t('network-connections.labels.modem'), value: '02_nm_modem' },
    { title: i18n.t('network-connections.labels.canbus'), value: 'can' },
    { title: i18n.t('network-connections.labels.wifi-ap'), value: '04_nm_wifi_ap' },
  ];
  title = i18n.t('network-connections.labels.select-type');
  onSelect = undefined;
  onCancel = undefined;

  constructor(id) {
    this.id = id ? id : this.id;
    makeAutoObservable(this);
  }

  show() {
    return new Promise((resolve, reject) => {
      this.onSelect = type => {
        this.active = false;
        resolve(type);
      };
      this.onCancel = () => {
        this.active = false;
        reject('cancel');
      };
      this.active = true;
    });
  }
}

export default SelectNewConnectionModalState;
