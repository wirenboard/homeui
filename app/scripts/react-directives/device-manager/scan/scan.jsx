import React from 'react';
import { observer } from 'mobx-react-lite';
import { useMediaQuery } from 'react-responsive';
import DevicesTable from './desktop';
import DevicesList from './mobile';
import { Trans, useTranslation } from 'react-i18next';
import { ScanState } from './scanPageStore';
import { Spinner, Button } from '../../common';

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
      ></div>
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

const FastScanResultPanel = ({ onStartScanning }) => {
  const { t } = useTranslation();
  return (
    <div className="bottom-panel">
      <InfoMessage msg={t('scan.labels.try-normal-scan')} />
      <Button label={t('scan.buttons.scan')} onClick={onStartScanning} />
    </div>
  );
};

const BottomPanel = observer(({ scanStore, nothingFound, onStartScanning, onStopScanning }) => {
  const { t } = useTranslation();
  const scanInProgress = scanStore.actualState == ScanState.Started;
  if (scanInProgress) {
    if (scanStore.isExtendedScanning) {
      return <FastScanProgressPanel scanStore={scanStore} />;
    }
    return <NormalScanProgressPanel scanStore={scanStore} onStopScanning={onStopScanning} />;
  }
  if (scanStore.isExtendedScanning) {
    return <FastScanResultPanel onStartScanning={onStartScanning} />;
  }
  if (nothingFound) {
    return <InfoMessage msg={t('scan.labels.not-found')} />;
  }
  return null;
});

export const ScanPageHeader = ({ okButtonLabel, onOk, onCancel, disableOkButton }) => {
  const { t } = useTranslation();
  return (
    <h1 className="page-header">
      <span>{t('scan.title')}</span>
      <div className="pull-right button-group">
        <Button type={'success'} label={okButtonLabel} onClick={onOk} disabled={disableOkButton} />
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
          nothingFound={noNewDevices}
          onStartScanning={() => store.startStandardScanning()}
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
        nothingFound={noNewDevices}
        onStartScanning={() => store.startStandardScanning()}
        onStopScanning={() => store.stopScanning()}
      />
    </div>
  );
});
