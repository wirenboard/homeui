import React from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../../common';
import SimpleModal from '../../components/modals/simpleModal';
import { observer } from 'mobx-react-lite';

const SetupDevicesModal = observer(({ store }) => {
  const { t } = useTranslation();
  return (
    <SimpleModal {...store.simpleModalState}>
      {store.setupPort !== undefined && (
        <Checkbox
          label={t('device-manager.labels.setup-port')}
          value={store.setupPort}
          onChange={e => store.setSetupPort(e.target.checked)}
        />
      )}
    </SimpleModal>
  );
});

export default SetupDevicesModal;
