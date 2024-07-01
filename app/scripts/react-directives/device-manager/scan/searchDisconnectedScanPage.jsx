import React from 'react';
import { observer } from 'mobx-react-lite';
import { ErrorBar } from '../../common';
import { useTranslation } from 'react-i18next';
import { ScanPageBody, ScanPageHeader } from './scan';

export const SearchDisconnectedScanPage = observer(({ pageStore }) => {
  const { t } = useTranslation();
  return (
    <div className="scan-page device-manager-page">
      <ErrorBar msg={pageStore.commonScanStore.globalError.error} />
      <ScanPageHeader
        okButtonLabel={t('scan.buttons.setup-as-selected')}
        onOk={() => pageStore.onOk()}
        onCancel={() => pageStore.onCancel()}
        disableOkButton={!pageStore.commonScanStore.hasSelectedItems}
      />
      <ScanPageBody store={pageStore.commonScanStore} />
    </div>
  );
});

export default SearchDisconnectedScanPage;
