'use strict';

import { OptionsStore } from '../../forms/optionsStore';
import { IntegerStore } from '../../forms/numberStore';
import i18n from '../../../i18n/react/config';
import { FormStore } from '../../forms/formStore';

async function showCopyDeviceModal(formModalState, portOptions, currentPort) {
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
    'count',
    new IntegerStore({
      name: i18n.t('device-manager.labels.copy-count'),
      min: 1,
      value: 1,
      strict: true,
    })
  );
  return await formModalState.show(
    i18n.t('device-manager.labels.copy-device'),
    form,
    i18n.t('device-manager.buttons.copy')
  );
}

export default showCopyDeviceModal;
