import React from 'react';
import { useTranslation } from 'react-i18next';

export function WarningTag({ text }) {
  return <span className="tag bg-warning text-nowrap">{text}</span>;
}

export function ErrorTag({ text, title }) {
  return (
    <span className="tag bg-danger text-nowrap" title={title}>
      {text}
    </span>
  );
}

export const ErrorCheck = ({ errors, errorId, children }) => {
  const { t } = useTranslation();
  const error = errors.find(e => e.id === errorId);
  if (error) {
    return <ErrorTag text={t('com.wb.device_manager.error')} title={t(errorId) || error.message} />;
  }
  return <>{children}</>;
};

export function FirmwareVersion({ version, availableFw, extSupport, errors }) {
  const { t } = useTranslation();
  return (
    <ErrorCheck errors={errors} errorId={'com.wb.device_manager.device.read_fw_version_error'}>
      {version}
      {availableFw && (
        <WarningTag text={t('device-manager.labels.available', { version: availableFw })} />
      )}
      {extSupport && (
        <span
          className="glyphicon glyphicon-flash"
          title={t('device-manager.labels.extended-modbus')}
        ></span>
      )}
    </ErrorCheck>
  );
}

export const DeviceName = ({ title, bootloaderMode, online, poll, errors }) => {
  const { t } = useTranslation();
  return (
    <ErrorCheck
      errors={errors}
      errorId={'com.wb.device_manager.device.read_device_signature_error'}
    >
      <div className="pull-left">
        <b>{title}</b>
      </div>
      <div className="pull-right">
        {bootloaderMode && <ErrorTag text={t('device-manager.labels.in-bootloder')} />}
        {!online && <ErrorTag text={t('device-manager.labels.offline')} />}
        {!poll && <WarningTag text={t('device-manager.labels.not-polled')} />}
      </div>
    </ErrorCheck>
  );
};

export const SlaveId = ({ slaveId, isDuplicate }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="slave-id">{slaveId}</span>{' '}
      {isDuplicate && <ErrorTag text={t('device-manager.labels.duplicate')} />}
    </>
  );
};

export const Port = ({ path, baudRate, dataBits, parity, stopBits }) => {
  return (
    <>
      {path} <span className="baudrate">{baudRate}</span> {dataBits.toString()}
      {parity}
      {stopBits.toString()}
    </>
  );
};
