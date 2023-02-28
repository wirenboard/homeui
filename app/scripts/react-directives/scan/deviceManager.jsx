import React from 'react';
import { observer } from 'mobx-react-lite';
import { useMediaQuery } from 'react-responsive';
import DevicesTable from './desktop';
import DevicesList from './mobile';
import { Trans, useTranslation } from 'react-i18next';
import { ScanState } from './scan';
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

function ScanButton({ actualState, requiredState, onStartScanning, onStopScanning }) {
  const { t } = useTranslation();
  const scanInProgress = actualState == ScanState.Started;
  const classNames = 'btn pull-right ' + (scanInProgress ? 'btn-danger' : 'btn-success');
  const onClick = scanInProgress ? onStopScanning : onStartScanning;

  const transition = requiredState !== ScanState.NotSpecified && actualState != requiredState;
  return (
    <button disabled={transition} className={classNames} onClick={onClick}>
      {scanInProgress ? t('device-manager.buttons.stop') : t('device-manager.buttons.scan')}
    </button>
  );
}

function Header(params) {
  const { t } = useTranslation();
  return (
    <h1>
      {t('device-manager.title')}
      <ScanButton {...params} />
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
  ({ mqtt, scanning, devices, errors, onStartScanning, onStopScanning }) => {
    const { t } = useTranslation();
    if (mqtt.waitStartup) {
      return <Spinner />;
    }
    if (!mqtt.deviceManagerIsAvailable) {
      return <ErrorBar msg={errors.error} />;
    }
    const nothingFound = devices.devices.length == 0;
    const scanInProgress = scanning.actualState == ScanState.Started;
    return (
      <>
        {!(scanning.firstStart && nothingFound) && <ErrorBar msg={errors.error} />}
        <Header
          actualState={scanning.actualState}
          requiredState={scanning.requiredState}
          onStartScanning={onStartScanning}
          onStopScanning={onStopScanning}
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
      </>
    );
  }
);

function CreateDevicesPage(props) {
  return <DevicesPage {...props} />;
}

export default CreateDevicesPage;
