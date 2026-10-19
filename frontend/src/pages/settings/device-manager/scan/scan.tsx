import { observer } from 'mobx-react-lite';
import { Trans, useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { documentation } from '@/common/links';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { useConfirm } from '@/components/confirm';
import { Progress } from '@/components/progress';
import { PageLayout } from '@/layouts/page';
import { ScanState } from '@/pages/settings/device-manager/scan/stores/types';
import { authStore, UserRole } from '@/stores/auth';
import { DevicesTable } from './components/desktop';
import { DevicesList } from './components/mobile';
import { SetupAddressModal } from './components/setup-address-modal';
import { type ScanPageProps } from './types';
import './styles.css';

const ScanPage = observer(({ pageStore, scanType, onAddDeviceManually }: ScanPageProps) => {
  const { t, i18n } = useTranslation();
  const isDesktop = useMediaQuery({ minWidth: 874 });
  const [confirmAddressChange, isConfirmOpened, handleConfirm, handleClose, devicesToModify] = useConfirm<any>();
  const nothingFound = !pageStore.commonScanStore.devicesStore.newDevices.length
    && !pageStore.commonScanStore.devicesStore.alreadyConfiguredDevices.length;
  const isScanning = pageStore.commonScanStore.scanStore.actualState === ScanState.Started;
  const isExtendedScanning = pageStore.commonScanStore.scanStore.isExtendedScanning;
  const showFastModbusNotice = scanType === 'new' && isScanning && isExtendedScanning;

  return (
    <>
      <PageLayout
        title={t(scanType === 'new' ? 'scan.title' : 'scan.search-disconnected-title')}
        infoLink={documentation[i18n.language]?.scan}
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
          {(isScanning || !nothingFound) && (
            isDesktop ? (
              <DevicesTable
                isScanning={isScanning}
                newDevices={pageStore.commonScanStore.devicesStore.newDevices}
                alreadyConfiguredDevices={pageStore.commonScanStore.devicesStore.alreadyConfiguredDevices}
                collapseButtonState={pageStore.commonScanStore.alreadyConfiguredDevicesCollapseButtonState}
                selectionValue={pageStore.commonScanStore.deviceSelectionState}
                toggleSelection={(val) => pageStore.commonScanStore.toggleDeviceSelection(val)}
              />
            ) : (
              <DevicesList
                isScanning={isScanning}
                newDevices={pageStore.commonScanStore.devicesStore.newDevices}
                alreadyConfiguredDevices={pageStore.commonScanStore.devicesStore.alreadyConfiguredDevices}
                selectionValue={pageStore.commonScanStore.deviceSelectionState}
                toggleSelection={(val) => pageStore.commonScanStore.toggleDeviceSelection(val)}
              />
            )
          )}
          {showFastModbusNotice && (
            <Alert variant="info" className="scan-fastModbusNotice">
              <p className="scan-fastModbusText">
                <Trans
                  i18nKey="scan.labels.fast-modbus-notice"
                  components={[
                    <a target="_blank" rel="noopener noreferrer"></a>,
                  ]}
                />
              </p>
              <div className="scan-buttonGroup">
                <Button
                  variant="secondary"
                  label={t('device-manager.buttons.add-custom-device')}
                  onClick={onAddDeviceManually}
                />
              </div>
            </Alert>
          )}
          {isScanning ? (
            <div className="scan-bottomPanel">
              <Progress value={pageStore.commonScanStore.scanStore.progress} />
              <p className="scan-infoMessage">
                <Trans>
                  {t(isExtendedScanning ? 'scan.labels.fast-scanning' : 'scan.labels.scanning', {
                    ports: pageStore.commonScanStore.scanStore.scanningPorts.join(', '),
                  })}
                </Trans>
              </p>
              <Button
                variant="secondary"
                label={t('scan.buttons.stop')}
                onClick={() => pageStore.commonScanStore.stopScanning()}
              />
            </div>
          ) : (
            <Alert variant="info" className="scan-tryNormalScanNotice">
              <p className="scan-tryNormalScanText">{t('scan.labels.try-normal-scan')}</p>
              <p className="scan-tryNormalScanText">{t('scan.labels.try-normal-scan-caveat')}</p>
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
                {scanType === 'new' && (
                  <Button
                    variant="secondary"
                    label={t('device-manager.buttons.add-custom-device')}
                    onClick={onAddDeviceManually}
                  />
                )}
              </div>
            </Alert>
          )}
        </div>
      </PageLayout>
      {scanType === 'new' && (
        <SetupAddressModal
          isOpened={isConfirmOpened}
          devices={devicesToModify ?? []}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
    </>
  );
});

export default ScanPage;
