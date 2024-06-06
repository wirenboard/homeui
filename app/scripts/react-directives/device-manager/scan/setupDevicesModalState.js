'use strict';

import { makeAutoObservable } from 'mobx';
import SimpleModalState from '../../components/modals/simpleModalState';
import i18n from '../../../i18n/react/config';

class SetupDevicesModalState {
  setupPort = true;

  constructor() {
    this.simpleModalState = new SimpleModalState('setup-device-options-modal');
    makeAutoObservable(this);
  }

  setSetupPort(value) {
    this.setupPort = value;
  }

  show(showSetupPort) {
    this.setupPort = showSetupPort ? true : undefined;
    return this.simpleModalState.show(
      i18n.t('device-manager.labels.options'),
      i18n.t('device-manager.buttons.apply')
    );
  }
}

export default SetupDevicesModalState;
