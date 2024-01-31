import React from 'react';
import { observer } from 'mobx-react-lite';
import { useMediaQuery } from 'react-responsive';
import DevicesTable from './desktop';
import DevicesList from './mobile';
import { Trans, useTranslation } from 'react-i18next';
import { ScanState } from './pageStore';
import { Spinner, ErrorBar } from '../common';

const Desktop = ({ children }) => {
  const isDesktop = useMediaQuery({ minWidth: 874 });
  return isDesktop ? children : null;
};
const Mobile = ({ children }) => {
  const isMobile = useMediaQuery({ maxWidth: 873 });
  return isMobile ? children : null;
};

function InfoMessage({ msg }) {
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
}

const ToConfigButton = ({ onClick, actualState, hasDevices }) => {
  const { t } = useTranslation();
  const scanInProgress = actualState == ScanState.Started;
  return (
    <button
      className={'btn btn-default'}
      onClick={onClick}
      disabled={scanInProgress || !hasDevices}
    >
      {t('device-manager.buttons.to-serial')}
    </button>
  );
};

function ScanButton({ actualState, requiredState, onStartScanning, onStopScanning }) {
  const { t } = useTranslation();
  const scanInProgress = actualState == ScanState.Started;
  const classNames = 'btn ' + (scanInProgress ? 'btn-danger' : 'btn-success');
  const onClick = scanInProgress ? onStopScanning : onStartScanning;

  const transition = requiredState !== ScanState.NotSpecified && actualState != requiredState;
  return (
    <button disabled={transition} className={classNames} onClick={onClick}>
      {scanInProgress ? t('device-manager.buttons.stop') : t('device-manager.buttons.scan')}
    </button>
  );
}

function Header({
  actualState,
  requiredState,
  onStartScanning,
  onStopScanning,
  onUpdateSerialConfig,
  hasDevices,
}) {
  const { t } = useTranslation();
  return (
    <h1 className="page-header">
      <span>{t('device-manager.title')}</span>
      <div className="pull-right button-group">
        <ToConfigButton
          onClick={onUpdateSerialConfig}
          actualState={actualState}
          hasDevices={hasDevices}
        />
        <ScanButton
          actualState={actualState}
          requiredState={requiredState}
          onStartScanning={onStartScanning}
          onStopScanning={onStopScanning}
        />
      </div>
    </h1>
  );
}

function ScanProgressBar({ scanning, progress }) {
  if (scanning) {
    return (
      <div className="progress scan-progress">
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
          style={{ width: progress + '%' }}
        ></div>
      </div>
    );
  }
  return <div className="separator"></div>;
}

function ScanningMessage({ ports, count, ext }) {
  const { t } = useTranslation();
  return (
    <>
      <Spinner />
      <InfoMessage msg={t('device-manager.labels.found-devices', { count })} />
      <InfoMessage
        msg={t(ext ? 'device-manager.labels.fast-scanning' : 'device-manager.labels.scanning', {
          ports,
        })}
      />
      <InfoMessage msg={t('device-manager.labels.scanning-stop')} />
    </>
  );
}

function NotFoundMessage({ firstStart }) {
  const { t } = useTranslation();
  if (firstStart) {
    return <InfoMessage msg={t('device-manager.labels.first-start')} />;
  }
  return <InfoMessage msg={t('device-manager.labels.not-found')} />;
}

const DevicesPage = observer(
  ({ mqtt, scanning, devices, errors, onStartScanning, onStopScanning, onUpdateSerialConfig }) => {
    if (mqtt.waitStartup) {
      return <Spinner />;
    }
    if (!mqtt.deviceManagerIsAvailable) {
      return <ErrorBar msg={errors.error} />;
    }
    const nothingFound = devices.devices.length == 0;
    const scanInProgress = scanning.actualState == ScanState.Started;
    return (
      <div className="device-manager-page">
        {!(scanning.firstStart && nothingFound) && <ErrorBar msg={errors.error} />}
        <Header
          actualState={scanning.actualState}
          requiredState={scanning.requiredState}
          onStartScanning={onStartScanning}
          onStopScanning={onStopScanning}
          onUpdateSerialConfig={onUpdateSerialConfig}
          hasDevices={devices.devices.length}
        />
        <ScanProgressBar scanning={scanInProgress} progress={scanning.progress} />
        <Desktop>{!nothingFound && <DevicesTable devices={devices.devices} />}</Desktop>
        <Mobile>{!nothingFound && <DevicesList devices={devices.devices} />}</Mobile>
        {scanInProgress && (
          <ScanningMessage
            ports={scanning.scanningPorts.join(', ')}
            count={devices.devices.length}
            ext={scanning.isExtendedScanning}
          />
        )}
        {!scanInProgress && nothingFound && <NotFoundMessage firstStart={scanning.firstStart} />}
      </div>
    );
  }
);

function CreateDevicesPage(store) {
  return (
    <DevicesPage
      mqtt={store.mqttStore}
      scanning={store.scanStore}
      devices={store.devicesStore}
      errors={store.globalError}
      onStartScanning={() => store.startScanning()}
      onStopScanning={() => store.stopScanning()}
      onUpdateSerialConfig={() => store.updateSerialConfig()}
    />
  );
}

export default CreateDevicesPage;
