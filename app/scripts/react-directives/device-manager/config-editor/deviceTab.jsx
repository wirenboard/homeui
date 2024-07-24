import React from 'react';
import { Button, ErrorBar, Spinner, WarningBar } from '../../common';
import { useTranslation } from 'react-i18next';
import JsonEditor from '../../components/json-editor/jsonEditor';
import { observer } from 'mobx-react-lite';
import BootstrapLikeSelect from '../../components/select/select';

export const DeviceTab = observer(({ tab }) => {
  const isError = tab.hasInvalidConfig || tab.isDisconnected;
  const isWarning = tab.isDeprecated;
  const className = `device-tab${isError ? ' error' : isWarning ? ' warning' : ''}`;
  const showSign = isError || isWarning;

  return (
    <div className={className}>
      <span>{tab.name}</span>
      {tab.firmwareVersion.hasUpdate && <i className="glyphicon glyphicon-refresh"></i>}
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

const NewFirmwareAvailableWarning = observer(({ firmwareVersion }) => {
  const { t } = useTranslation();
  if (firmwareVersion.hasUpdate) {
    return (
      <WarningBar>
        <span>
          {t('device-manager.errors.new-firmware', {
            firmware: firmwareVersion.current,
            newFirmware: firmwareVersion.available,
          })}
        </span>
      </WarningBar>
    );
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

const DisconnectedError = ({ isDisconnected, onSearchDisconnectedDevice }) => {
  const { t } = useTranslation();
  if (isDisconnected) {
    return (
      <ErrorBar msg={t('device-manager.errors.is-disconnected')}>
        <Button
          label={t('device-manager.buttons.search-disconnected-device')}
          type="danger"
          onClick={onSearchDisconnectedDevice}
        />
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
        <NewFirmwareAvailableWarning firmwareVersion={tab.firmwareVersion} />
        <DisconnectedError
          isDisconnected={tab.isDisconnected}
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
