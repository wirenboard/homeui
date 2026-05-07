import { observer } from 'mobx-react-lite';
import { Trans, useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm';
import { Progress } from '@/components/progress';
import { PageLayout } from '@/layouts/page';
import { type NewDevicesScanPageStore } from '@/pages/settings/device-manager/scan';
import { ScanState } from '@/pages/settings/device-manager/scan/stores/scan-page-store';
import { authStore, UserRole } from '@/stores/auth';
import { DevicesTable } from './components/desktop';
import { DevicesList } from './components/mobile';
import { SetupAddressModal } from './components/setup-address-modal';
import { type ScanPageProps } from './types';
import './styles.css';

const ScanPage = observer(({ pageStore, scanType }: ScanPageProps) => {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery({ minWidth: 874 });
  const [confirmAddressChange, isConfirmOpened, handleConfirm, handleClose] = useConfirm<any>();
  const nothingFound = !pageStore.commonScanStore.devicesStore.newDevices.length
    && !pageStore.commonScanStore.devicesStore.alreadyConfiguredDevices.length;

  return (
    <>
      <PageLayout
        title={t(scanType === 'new' ? 'scan.title' : 'scan.search-disconnected-title')}
        hasRights={authStore.hasRights(UserRole.Admin)}
        isLoading={pageStore.commonScanStore.mqttStore.waitStartup}
        loadingOptions={{
          showActions: true,
        }}
        errors={
          pageStore.commonScanStore.globalError.error
            ? [{ variant: 'danger', text: pageStore.commonScanStore.globalError.error }]
            : []
        }
        actions={
          <>
            <Button
              label={t(scanType === 'new' ? 'scan.buttons.to-serial' : 'scan.buttons.setup-as-selected')}
              disabled={!pageStore.commonScanStore.hasSelectedItems}
              onClick={() => pageStore.onOk(confirmAddressChange)}
            />
            <Button
              variant="secondary"
              label={t('scan.buttons.cancel')}
              onClick={() => pageStore.onCancel()}
            />
          </>
        }
      >
        {scanType === 'disconnected' && (
          <p className="scan-disconnectedNotice"><strong>{t('scan.labels.notice')}</strong></p>
        )}
        <div>
          {!nothingFound && (
            isDesktop ? (
              <DevicesTable
                newDevices={pageStore.commonScanStore.devicesStore.newDevices}
                alreadyConfiguredDevices={pageStore.commonScanStore.devicesStore.alreadyConfiguredDevices}
                collapseButtonState={pageStore.commonScanStore.alreadyConfiguredDevicesCollapseButtonState}
                selectionValue={pageStore.commonScanStore.deviceSelectionState}
                toggleSelection={(val) => pageStore.commonScanStore.toggleDeviceSelection(val)}
              />
            ) : (
              <DevicesList
                newDevices={pageStore.commonScanStore.devicesStore.newDevices}
                alreadyConfiguredDevices={pageStore.commonScanStore.devicesStore.alreadyConfiguredDevices}
                selectionValue={pageStore.commonScanStore.deviceSelectionState}
                toggleSelection={(val) => pageStore.commonScanStore.toggleDeviceSelection(val)}
              />
            )
          )}
          {pageStore.commonScanStore.scanStore.actualState === ScanState.Started ? (
            <div className="scan-bottomPanel">
              <Progress value={pageStore.commonScanStore.scanStore.progress} />
              <p className="scan-infoMessage">
                <Trans>
                  {t(pageStore.commonScanStore.scanStore.isExtendedScanning
                    ? 'scan.labels.fast-scanning'
                    : 'scan.labels.scanning', {
                    ports: pageStore.commonScanStore.scanStore.scanningPorts.join(', '),
                  })}
                </Trans>
              </p>
              {!pageStore.commonScanStore.scanStore.isExtendedScanning && (
                <Button
                  variant="secondary"
                  label={t('scan.buttons.stop')}
                  onClick={() => pageStore.commonScanStore.stopScanning()}
                />
              )}
            </div>
          ) : (
            <div className="scan-bottomPanel">
              <p className="scan-infoMessage">
                <Trans>{t('scan.labels.try-normal-scan')}</Trans>
              </p>
              <div className="scan-buttonGroup">
                <Button
                  variant="secondary"
                  label={t('scan.buttons.scan')}
                  onClick={() => pageStore.commonScanStore.startStandardScanning()}
                />
                <Button
                  variant="secondary"
                  label={t('scan.buttons.bootloader-scan')}
                  onClick={() => pageStore.commonScanStore.startBootloaderScanning()}
                />
              </div>
            </div>
          )}
        </div>
      </PageLayout>
      {scanType === 'new' && (
        <SetupAddressModal
          isOpened={isConfirmOpened}
          devices={(pageStore as NewDevicesScanPageStore).devicesToModify}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
    </>
  );
});

export default ScanPage;
