import i18n from '../../../i18n/react/config';
import SimpleModalState from '../../components/modals/simpleModalState';

class SetupAddressModalState {
  constructor() {
    this.devices = [];
    this.simpleModalState = new SimpleModalState('confirm-setup-device-addresses-modal');
  }

  show(devices) {
    this.devices = devices;
    return this.simpleModalState.show(
      i18n.t('device-manager.labels.address-conflicts'),
      i18n.t('common.buttons.apply')
    );
  }
}

export default SetupAddressModalState;
