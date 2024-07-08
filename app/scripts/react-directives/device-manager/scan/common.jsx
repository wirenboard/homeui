import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Checkbox } from '../../common';

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

export function MultilineErrorTag({ text, title }) {
  return (
    <>
      <div className="flex-break"></div>
      <div className="tag multiline-tag bg-danger" title={title}>
        <Trans>{text}</Trans>
      </div>
    </>
  );
}

export const ErrorCheck = ({ errors, errorId, children }) => {
  const { t } = useTranslation();
  const error = errors?.find(e => e.id === errorId);
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
      {availableFw && <WarningTag text={t('scan.labels.available', { version: availableFw })} />}
      {extSupport && (
        <span className="glyphicon glyphicon-flash" title={t('scan.labels.extended-modbus')}></span>
      )}
    </ErrorCheck>
  );
}

const DeviceNameLabel = ({ title, selectable, selected, onSelectionChange, disabled }) => {
  if (selectable) {
    return (
      <Checkbox value={selected} onChange={onSelectionChange} disabled={disabled} label={title} />
    );
  }
  return <b>{title}</b>;
};

export const DeviceName = ({
  title,
  bootloaderMode,
  errors,
  duplicateMqttTopic,
  unknownType,
  selected,
  onSelectionChange,
  matchingDeviceTypes,
  selectable,
}) => {
  const { t } = useTranslation();
  return (
    <ErrorCheck
      errors={errors}
      errorId={'com.wb.device_manager.device.read_device_signature_error'}
    >
      <DeviceNameLabel
        title={title}
        selectable={selectable}
        selected={selected}
        onSelectionChange={onSelectionChange}
        disabled={unknownType}
      />
      {bootloaderMode && <ErrorTag text={t('scan.labels.in-bootloder')} />}
      {duplicateMqttTopic && <ErrorTag text={t('scan.labels.duplicate-topic')} />}
      {unknownType && <ErrorTag text={t('scan.labels.unknown-device-type')} />}
      {matchingDeviceTypes.length > 1 && (
        <MultilineErrorTag
          text={t('scan.labels.similar-device-signatures', {
            types: matchingDeviceTypes.map(deviceType => '- ' + deviceType).join(',<br>'),
            interpolation: { escapeValue: false },
          })}
        />
      )}
    </ErrorCheck>
  );
};

export const SlaveId = ({ slaveId, isDuplicate }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="slave-id">{slaveId}</span> <wbr></wbr>
      {isDuplicate && <ErrorTag text={t('scan.labels.duplicate')} />}
    </>
  );
};

export const Port = ({ path, baudRate, dataBits, parity, stopBits, misconfiguredPort }) => {
  const { t } = useTranslation();
  return (
    <>
      {path} <span className="baudrate">{baudRate}</span> {dataBits.toString()}
      {parity}
      {stopBits.toString()} <wbr></wbr>
      {misconfiguredPort && <ErrorTag text={t('scan.labels.misconfigured-port')} />}
    </>
  );
};
