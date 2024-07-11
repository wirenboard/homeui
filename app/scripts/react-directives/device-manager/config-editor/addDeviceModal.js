'use strict';

import { getFirstOptionValue, OptionsStore } from '../../forms/optionsStore';
import i18n from '../../../i18n/react/config';
import { FormStore } from '../../forms/formStore';

async function showAddDeviceModal(formModalState, portOptions, deviceOptions, currentPort) {
  let form = new FormStore();
  form.add(
    'port',
    new OptionsStore({
      name: i18n.t('device-manager.labels.port'),
      options: portOptions,
      value: currentPort,
    })
  );
  form.add(
    'deviceType',
    new OptionsStore({
      name: i18n.t('device-manager.labels.device-type'),
      options: deviceOptions,
      value: getFirstOptionValue(deviceOptions),
    })
  );
  return await formModalState.show(
    i18n.t('device-manager.labels.add-device'),
    form,
    i18n.t('device-manager.buttons.add')
  );
}

export default showAddDeviceModal;
