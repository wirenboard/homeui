import { useTranslation, Trans } from 'react-i18next';
import FlashIcon from '@/assets/icons/flash.svg';
import { Alert } from '@/components/alert';
import { BooleanField } from '@/components/form';
import { Tag } from '@/components/tag';
import './styles.css';

export const ErrorCheck = ({ errors, errorId, children }) => {
  const { t } = useTranslation();
  const error = errors?.find((error: any) => error.id === errorId);
  if (error) {
    return (
      <Alert variant="danger" size="small" withIcon={false}>
        <div>{t('com.wb.device_manager.error')}</div>
        <div>{t(errorId) || error.message}</div>
      </Alert>
    );
  }
  return <>{children}</>;
};

export const FirmwareVersion = ({ version, availableFw, extSupport, errors }) => {
  const { t } = useTranslation();
  return (
    <ErrorCheck errors={errors} errorId="com.wb.serial_driver.device.read_fw_version_error">
      {version}
      {availableFw && <Tag variant="warn">{t('scan.labels.available', { version: availableFw })}</Tag>}
      {extSupport && (
        <FlashIcon
          className="scanFirmwareVersion-extendedModbus"
          title={t('scan.labels.extended-modbus')}
        />
      )}
    </ErrorCheck>
  );
};

const DeviceNameLabel = ({ title, selectable, selected, onSelectionChange, disabled }) => {
  if (selectable) {
    return (
      <BooleanField
        view="checkbox"
        value={selected}
        title={title}
        isDisabled={disabled}
        onChange={onSelectionChange}
      />
    );
  }
  return <b>{title}</b>;
};

const InBootloaderErrorTag = ({ bootloaderMode, selectable }) => {
  const { t } = useTranslation();
  if (!bootloaderMode) {
    return null;
  }
  if (selectable) {
    return <Tag variant="danger">{t('scan.labels.in-bootloader')}</Tag>;
  }
  return (
    <Tag variant="danger">
      <Trans i18nKey="scan.labels.in-bootloader-link" components={[<a></a>]} />
    </Tag>
  );
};

export const DeviceName = ({
  title,
  bootloaderMode,
  errors,
  duplicateMqttTopic,
  unknownType,
  selected,
  onSelectionChange,
  otherMatchingDeviceTypesNames,
  selectable,
  isScanning,
}) => {
  const { t } = useTranslation();
  return (
    <ErrorCheck
      errors={errors}
      errorId="com.wb.serial_driver.device.read_device_signature_error"
    >
      <DeviceNameLabel
        title={title}
        selectable={selectable}
        selected={selected}
        disabled={isScanning || unknownType}
        onSelectionChange={onSelectionChange}
      />
      <InBootloaderErrorTag bootloaderMode={bootloaderMode} selectable={selectable} />
      {duplicateMqttTopic && <Tag variant="danger">{t('scan.labels.duplicate-topic')}</Tag>}
      {unknownType && <Tag variant="danger">{t('scan.labels.unknown-device-type')}</Tag>}
      {otherMatchingDeviceTypesNames.length > 0 && (
        <Alert variant="danger" size="small" withIcon={false} className="scanDeviceName-similarSignatures">
          <Trans
            i18nKey="scan.labels.similar-device-signatures"
            components={{
              br: <br />,
            }}
            values={{
              types: otherMatchingDeviceTypesNames.map((deviceType: string) => '- ' + deviceType).join('\n'),
            }}
          />
        </Alert>
      )}
    </ErrorCheck>
  );
};

export const SlaveId = ({ slaveId, isDuplicate }) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="scanSlaveId">{slaveId}</span> <wbr></wbr>
      {isDuplicate && <Tag variant="danger">{t('scan.labels.duplicate')}</Tag>}
    </>
  );
};

export const Port = ({ path, baudRate, dataBits, parity, stopBits, misconfiguredPort }) => {
  const { t } = useTranslation();
  return (
    <>
      {path} <span className="scanPort-baudrate">{baudRate}</span> {dataBits.toString()}
      {parity}
      {stopBits.toString()} <wbr></wbr>
      {misconfiguredPort && <Tag variant="danger">{t('scan.labels.misconfigured-port')}</Tag>}
    </>
  );
};
