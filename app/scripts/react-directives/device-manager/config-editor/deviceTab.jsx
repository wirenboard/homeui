import React from 'react';
import { Button, ErrorBar, Spinner, WarningBar } from '../../common';
import { useTranslation, Trans } from 'react-i18next';
import JsonEditor from '../../components/json-editor/jsonEditor';
import { observer } from 'mobx-react-lite';
import BootstrapLikeSelect from '../../components/select/select';

const FirmwareUpdateIcon = observer(({ firmware }) => {
  if (firmware.isUpdating) {
    return <i className="glyphicon glyphicon-refresh animation-rotate"></i>;
  }
  if (firmware.hasUpdate) {
    return <i className="glyphicon glyphicon-refresh"></i>;
  }
  return null;
});

export const DeviceTab = observer(({ tab }) => {
  const isError = tab.hasInvalidConfig || tab.showDisconnectedError;
  const isWarning = tab.isDeprecated;
  const className = `device-tab${isError ? ' error' : isWarning ? ' warning' : ''}`;
  const showSign = isError || isWarning;

  return (
    <div className={className}>
      <span>{tab.name}</span>
      <FirmwareUpdateIcon firmware={tab.firmware} />
      {showSign && <i className="glyphicon glyphicon-exclamation-sign"></i>}
    </div>
  );
});

function findDeviceTypeSelectOption(options, value) {
  let res;
  options.find(option => {
    if (option?.options) {
      res = option.options.find(option => option.value === value);
      return !!res;
    }
    if (option.value === value) {
      res = option;
      return true;
    }
    return false;
  });
  return res;
}

export const UnknownDeviceTabContent = observer(({ tab, onDeleteTab }) => {
  const { t } = useTranslation();
  return (
    <>
      <ErrorBar msg={t('device-manager.errors.unknown-device-type', { type: tab.deviceType })}>
        <Button label={t('device-manager.buttons.delete')} type="danger" onClick={onDeleteTab} />
      </ErrorBar>
      <pre>{JSON.stringify(tab.data, null, 2)}</pre>
    </>
  );
});

const UpdateProgressBar = observer(({ progress }) => {
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
        {progress + '%'}
      </div>
    </div>
  );
});

const FirmwareUpdatePanel = observer(({ firmware }) => {
  const { t } = useTranslation();
  return (
    <div className="firmware-update-panel">
      <span>
        <b>
          {t('device-manager.labels.updating-firmware', {
            firmware: firmware.current,
            newFirmware: firmware.available,
          })}
        </b>
      </span>
      <UpdateProgressBar progress={firmware.updateProgress} />
    </div>
  );
});

const ActualFirmwarePanel = observer(({ firmwareVersion }) => {
  const { t } = useTranslation();
  return (
    <div className="actual-firmware-panel">
      <b>
        {t('device-manager.labels.actual-firmware', {
          firmware: firmwareVersion,
        })}
      </b>
    </div>
  );
});

const NewFirmwareWarning = observer(({ firmware, onUpdateFirmware }) => {
  const { t } = useTranslation();
  return (
    <WarningBar>
      <span className="warning-text">
        <Trans
          i18nKey={
            firmware.canUpdate
              ? 'device-manager.labels.new-firmware'
              : 'device-manager.labels.new-firmware-cant-upgrade'
          }
          components={[<a></a>]}
          values={{
            firmware: firmware.current,
            newFirmware: firmware.available,
          }}
        />
      </span>
      {firmware.canUpdate && (
        <Button
          label={t('device-manager.buttons.update')}
          type="warning"
          onClick={onUpdateFirmware}
        />
      )}
    </WarningBar>
  );
});

const FirmwarePanel = observer(({ firmware, onUpdateFirmware }) => {
  if (firmware.isUpdating) {
    return <FirmwareUpdatePanel firmware={firmware} />;
  }
  if (firmware.hasUpdate) {
    return <NewFirmwareWarning firmware={firmware} onUpdateFirmware={onUpdateFirmware} />;
  }
  if (firmware.current) {
    return <ActualFirmwarePanel firmwareVersion={firmware.current} />;
  }
  return null;
});

const DeprecatedWarning = ({ isDeprecated }) => {
  const { t } = useTranslation();
  if (isDeprecated) {
    return (
      <WarningBar>
        <span>{t('device-manager.errors.deprecated')}</span>
      </WarningBar>
    );
  }
  return null;
};

const DuplicateSlaveIdError = ({ isDuplicate }) => {
  const { t } = useTranslation();
  if (isDuplicate) {
    return <ErrorBar msg={t('device-manager.errors.duplicate-slave-id')} />;
  }
  return null;
};

const SameMqttIdError = ({ devicesWithTheSameId, onSetUniqueMqttTopic }) => {
  const { t } = useTranslation();
  if (devicesWithTheSameId.length != 0) {
    return (
      <ErrorBar
        msg={t('device-manager.errors.duplicate-mqtt-topic', {
          device: devicesWithTheSameId.join(', '),
          interpolation: { escapeValue: false },
        })}
      >
        <Button
          label={t('device-manager.buttons.resolve-duplicate-mqtt-topic')}
          type="danger"
          onClick={onSetUniqueMqttTopic}
        />
      </ErrorBar>
    );
  }
  return null;
};

const DisconnectedError = ({ isDisconnected, isWbDevice, onSearchDisconnectedDevice }) => {
  const { t } = useTranslation();
  if (isDisconnected) {
    return (
      <ErrorBar msg={t('device-manager.errors.is-disconnected')}>
        {isWbDevice && (
          <Button
            label={t('device-manager.buttons.search-disconnected-device')}
            type="danger"
            onClick={onSearchDisconnectedDevice}
          />
        )}
      </ErrorBar>
    );
  }
  return null;
};

export const DeviceTabContent = observer(
  ({
    tab,
    index,
    onDeleteTab,
    onCopyTab,
    deviceTypeSelectOptions,
    onDeviceTypeChange,
    onSetUniqueMqttTopic,
    onSearchDisconnectedDevice,
    onUpdateFirmware,
  }) => {
    const { t } = useTranslation();
    if (tab.loading) {
      return <Spinner />;
    }
    if (tab.error) {
      return <ErrorBar msg={tab.error} />;
    }
    if (tab.isUnknownType) {
      return <UnknownDeviceTabContent tab={tab} onDeleteTab={onDeleteTab} />;
    }
    const selectedDeviceType = findDeviceTypeSelectOption(deviceTypeSelectOptions, tab.deviceType);
    return (
      <div>
        <DeprecatedWarning isDeprecated={tab.isDeprecated} />
        <FirmwarePanel firmware={tab.firmware} onUpdateFirmware={onUpdateFirmware} />
        <DisconnectedError
          isDisconnected={tab.showDisconnectedError}
          isWbDevice={tab.isWbDevice}
          onSearchDisconnectedDevice={onSearchDisconnectedDevice}
        />
        <DuplicateSlaveIdError isDuplicate={tab.slaveIdIsDuplicate} />
        <SameMqttIdError
          devicesWithTheSameId={tab.devicesWithTheSameId}
          onSetUniqueMqttTopic={onSetUniqueMqttTopic}
        />
        <BootstrapLikeSelect
          options={deviceTypeSelectOptions}
          selectedOption={selectedDeviceType}
          onChange={option => onDeviceTypeChange(tab, option.value)}
          className={'pull-left device-type-select'}
        />
        <div className="pull-right button-group">
          <Button label={t('device-manager.buttons.delete')} type="danger" onClick={onDeleteTab} />
          <Button label={t('device-manager.buttons.copy')} onClick={onCopyTab} />
        </div>
        <JsonEditor
          schema={tab.schema}
          data={tab.editedData}
          root={'dev' + index}
          onChange={tab.setData}
          className={'device-tab-properties'}
        />
      </div>
    );
  }
);
