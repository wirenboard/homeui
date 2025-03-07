import { observer } from 'mobx-react-lite';
import { Trans, useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Spinner, Button } from '../../common';
import DevicesTable from './desktop';
import DevicesList from './mobile';
import { ScanState } from './scanPageStore';

const InfoMessage = ({ msg }) => {
  if (!msg) {
    return null;
  }
  return (
    <p className="text-center">
      <strong className="text-center">
        <Trans>{msg}</Trans>
      </strong>
    </p>
  );
};

const ScanProgressBar = observer(({ progress }) => {
  return (
    <div className="progress">
      <div
        className="progress-bar progress-bar-striped active"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin="0"
        aria-valuemax="100"
        style={{ width: progress + '%' }}
      >
      </div>
    </div>
  );
});

const ScanningMessage = observer(({ ports, ext }) => {
  const { t } = useTranslation();
  return (
    <InfoMessage
      msg={t(ext ? 'scan.labels.fast-scanning' : 'scan.labels.scanning', {
        ports,
      })}
    />
  );
});

const FastScanProgressPanel = observer(({ scanStore }) => {
  return (
    <div className="bottom-panel">
      <ScanProgressBar progress={scanStore.progress} />
      <ScanningMessage
        ports={scanStore.scanningPorts.join(', ')}
        ext={scanStore.isExtendedScanning}
      />
    </div>
  );
});

const NormalScanProgressPanel = observer(({ scanStore, onStopScanning }) => {
  const { t } = useTranslation();
  return (
    <div className="bottom-panel">
      <ScanProgressBar progress={scanStore.progress} />
      <ScanningMessage
        ports={scanStore.scanningPorts.join(', ')}
        ext={scanStore.isExtendedScanning}
      />
      <Button label={t('scan.buttons.stop')} onClick={onStopScanning} />
    </div>
  );
});

const FastScanResultPanel = ({ onStartStandardScanning, onStartBootloaderScanning }) => {
  const { t } = useTranslation();
  return (
    <div className="bottom-panel">
      <InfoMessage msg={t('scan.labels.try-normal-scan')} />
      <div className="button-group">
        <Button label={t('scan.buttons.scan')} onClick={onStartStandardScanning} />
        <Button label={t('scan.buttons.bootloader-scan')} onClick={onStartBootloaderScanning} />
      </div>
    </div>
  );
};

const BottomPanel = observer(
  ({ scanStore, onStartStandardScanning, onStartBootloaderScanning, onStopScanning }) => {
    const scanInProgress = scanStore.actualState == ScanState.Started;
    if (scanInProgress) {
      if (scanStore.isExtendedScanning) {
        return <FastScanProgressPanel scanStore={scanStore} />;
      }
      return <NormalScanProgressPanel scanStore={scanStore} onStopScanning={onStopScanning} />;
    }
    return (
      <FastScanResultPanel
        onStartStandardScanning={onStartStandardScanning}
        onStartBootloaderScanning={onStartBootloaderScanning}
      />
    );
  }
);

export const ScanPageHeader = ({ okButtonLabel, onOk, onCancel, disableOkButton, title }) => {
  const { t } = useTranslation();
  return (
    <h1 className="page-header">
      <span>{title}</span>
      <div className="pull-right button-group">
        <Button type="success" label={okButtonLabel} disabled={disableOkButton} onClick={onOk} />
        <Button label={t('scan.buttons.cancel')} onClick={onCancel} />
      </div>
    </h1>
  );
};

export const ScanPageBody = observer(({ store }) => {
  const isDesktop = useMediaQuery({ minWidth: 874 });
  if (store.mqttStore.waitStartup) {
    return <Spinner />;
  }
  const noNewDevices = store.devicesStore.newDevices.length == 0;
  const nothingFound = noNewDevices && store.devicesStore.alreadyConfiguredDevices.length == 0;
  if (isDesktop) {
    return (
      <>
        {!nothingFound && (
          <DevicesTable
            newDevices={store.devicesStore.newDevices}
            alreadyConfiguredDevices={store.devicesStore.alreadyConfiguredDevices}
            collapseButtonState={store.alreadyConfiguredDevicesCollapseButtonState}
          />
        )}
        <BottomPanel
          scanStore={store.scanStore}
          onStartStandardScanning={() => store.startStandardScanning()}
          onStartBootloaderScanning={() => store.startBootloaderScanning()}
          onStopScanning={() => store.stopScanning()}
        />
      </>
    );
  }
  return (
    <div className="mobile-devices-list">
      {!nothingFound && (
        <DevicesList
          newDevices={store.devicesStore.newDevices}
          alreadyConfiguredDevices={store.devicesStore.alreadyConfiguredDevices}
          collapseButtonState={store.alreadyConfiguredDevicesCollapseButtonState}
        />
      )}
      <BottomPanel
        scanStore={store.scanStore}
        onStartStandardScanning={() => store.startStandardScanning()}
        onStartBootloaderScanning={() => store.startBootloaderScanning()}
        onStopScanning={() => store.stopScanning()}
      />
    </div>
  );
});
