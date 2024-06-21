import React from 'react';
import { observer } from 'mobx-react-lite';
import { ErrorBar, Button } from '../../common';
import { useTranslation } from 'react-i18next';
import ScanPageBody from './scan';
import SetupAddressModal from './setupAddressModal';

const Header = ({ onOk, onCancel, disableOkButton }) => {
  const { t } = useTranslation();
  return (
    <h1 className="page-header">
      <span>{t('scan.title')}</span>
      <div className="pull-right button-group">
        <Button
          type={'success'}
          label={t('scan.buttons.to-serial')}
          onClick={onOk}
          disabled={disableOkButton}
        />
        <Button label={t('scan.buttons.cancel')} onClick={onCancel} />
      </div>
    </h1>
  );
};

export const NewDevicesScanPage = observer(({ pageStore }) => {
  return (
    <div className="scan-page device-manager-page">
      <SetupAddressModal state={pageStore.setupAddressModalState} />
      <ErrorBar msg={pageStore.commonScanStore.globalError.error} />
      <Header
        onOk={() => pageStore.onOk()}
        onCancel={() => pageStore.onCancel()}
        disableOkButton={!pageStore.commonScanStore.hasSelectedItems}
      />
      <ScanPageBody store={pageStore.commonScanStore} />
    </div>
  );
});

export default NewDevicesScanPage;
