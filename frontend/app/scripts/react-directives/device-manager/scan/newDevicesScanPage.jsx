import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { ErrorBar } from '../../common';
import { ScanPageBody, ScanPageHeader } from './scan';
import SetupAddressModal from './setupAddressModal';

export const NewDevicesScanPage = observer(({ pageStore }) => {
  const { t } = useTranslation();
  return (
    <div className="scan-page device-manager-page">
      <SetupAddressModal state={pageStore.setupAddressModalState} />
      <ErrorBar msg={pageStore.commonScanStore.globalError.error} />
      <ScanPageHeader
        title={t('scan.title')}
        okButtonLabel={t('scan.buttons.to-serial')}
        disableOkButton={!pageStore.commonScanStore.hasSelectedItems}
        onOk={() => pageStore.onOk()}
        onCancel={() => pageStore.onCancel()}
      />
      <ScanPageBody store={pageStore.commonScanStore} />
    </div>
  );
});

export default NewDevicesScanPage;
