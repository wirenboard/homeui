import React from 'react';
import { observer } from 'mobx-react-lite';
import { useMediaQuery } from 'react-responsive';
import DevicesTable from './desktop';
import DevicesList from './mobile';
import { Trans, useTranslation } from 'react-i18next';
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

function ScanButton({ scanning, onStartScanning }) {
  const { t } = useTranslation();
  return (
    <button disabled={scanning} className="btn btn-success pull-right" onClick={onStartScanning}>
      {t('device-manager.buttons.scan')}
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

function ScanningMessage() {
  const { t } = useTranslation();
  return (
    <>
      <Spinner />
      <InfoMessage msg={t('device-manager.labels.scanning')} />
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

function NewFirmwaresNotice() {
  const { t } = useTranslation();
  return (
    <div className="alert alert-warning" role="warning">
      <i className="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></i>
      <span> {t('device-manager.labels.firmwares-notice')}</span>
      <a
        href="https://wirenboard.com/wiki/WB_Modbus_Devices_Firmware_Update"
        className="alert-link"
      >
        {t('device-manager.labels.firmwares-notice-link')}
      </a>
    </div>
  );
}

const DevicesPage = observer(({ mqtt, scanning, devices, errors, onStartScanning }) => {
  const { t } = useTranslation();
  if (mqtt.waitStartup) {
    return <Spinner />;
  }
  if (!mqtt.deviceManagerIsAvailable) {
    return <ErrorBar msg={errors.error} />;
  }
  const nothingFound = devices.devices.length == 0;
  return (
    <>
      <NewFirmwaresNotice />
      {!(scanning.firstStart && nothingFound) && <ErrorBar msg={errors.error} />}
      <Header scanning={scanning.scanning} onStartScanning={onStartScanning} />
      <ScanProgressBar scanning={scanning.scanning} progress={scanning.progress} />
      <Desktop>{!nothingFound && <DevicesTable devices={devices.devices} />}</Desktop>
      <Mobile>{!nothingFound && <DevicesList devices={devices.devices} />}</Mobile>
      {scanning.scanning && <ScanningMessage />}
      {!scanning.scanning && nothingFound && <NotFoundMessage firstStart={scanning.firstStart} />}
    </>
  );
});

function CreateDevicesPage(props) {
  return <DevicesPage {...props} />;
}

export default CreateDevicesPage;
