import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { ErrorBar } from '../../common';
import { ScanPageBody, ScanPageHeader } from './scan';

export const SearchDisconnectedScanPage = observer(({ pageStore }) => {
  const { t } = useTranslation();
  return (
    <div className="scan-page device-manager-page">
      <ErrorBar msg={pageStore.commonScanStore.globalError.error} />
      <ScanPageHeader
        title={t('scan.search-disconnected-title')}
        okButtonLabel={t('scan.buttons.setup-as-selected')}
        disableOkButton={!pageStore.commonScanStore.hasSelectedItems}
        onOk={() => pageStore.onOk()}
        onCancel={() => pageStore.onCancel()}
      />
      <ScanPageBody store={pageStore.commonScanStore} />
    </div>
  );
});

export default SearchDisconnectedScanPage;
