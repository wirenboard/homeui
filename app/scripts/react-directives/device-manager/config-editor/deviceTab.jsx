import React from 'react';
import {
  Button,
  ErrorBar,
  Spinner,
  WarningBar,
  WarningHeader,
  WarningPanel,
  ErrorPanel,
  ErrorHeader,
} from '../../common';
import { useTranslation, Trans } from 'react-i18next';
import JsonEditor from '../../components/json-editor/jsonEditor';
import { observer } from 'mobx-react-lite';
import BootstrapLikeSelect from '../../components/select/select';

const EmbeddedSoftwareUpdateIcon = observer(({ embeddedSoftware }) => {
  if (embeddedSoftware.isUpdating) {
    return <i className="glyphicon glyphicon-refresh animation-rotate"></i>;
  }
  if (embeddedSoftware.hasUpdate) {
    return <i className="glyphicon glyphicon-refresh"></i>;
  }
  return null;
});

export const DeviceTab = observer(({ tab }) => {
  const isError =
    tab.hasInvalidConfig || tab.showDisconnectedError || tab.embeddedSoftware.hasError;
  const isWarning = tab.isDeprecated;
  const className = `device-tab${isError ? ' error' : isWarning ? ' warning' : ''}`;
  const showSign = isError || isWarning;

  return (
    <div className={className}>
      <span>{tab.name}</span>
      <EmbeddedSoftwareUpdateIcon embeddedSoftware={tab.embeddedSoftware} />
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

const EmbeddedSoftwareUpdatePanel = observer(({ component }) => {
  const { t } = useTranslation();
  return (
    <WarningPanel className={'firmware-update-panel'}>
      <WarningHeader>
        <span>
          {t(
            component.type == 'firmware'
              ? 'device-manager.labels.updating-firmware'
              : 'device-manager.labels.updating-bootloader',
            {
              current: component.current,
              available: component.available,
            }
          )}
        </span>
      </WarningHeader>
      <UpdateProgressBar progress={component.updateProgress} />
      <span>
        <b>{t('device-manager.labels.update-firmware-notice')}</b>
      </span>
    </WarningPanel>
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

const NewEmbeddedSoftwareComponentWarning = observer(({ component, onUpdate }) => {
  const { t } = useTranslation();
  return (
    <WarningPanel>
      <WarningHeader>
        <Trans
          i18nKey={
            component.canUpdate
              ? 'device-manager.labels.new-' + component.type
              : 'device-manager.labels.cant-update-new-' + component.type
          }
          components={[<a></a>]}
          values={{
            current: component.current,
            available: component.available,
          }}
        />
      </WarningHeader>
      {component.canUpdate && (
        <Button label={t('device-manager.buttons.update')} type="warning" onClick={onUpdate} />
      )}
    </WarningPanel>
  );
});

const EmbeddedSoftwareComponentUpdateError = observer(({ component }) => {
  if (!component.hasError) {
    return null;
  }
  return (
    <ErrorPanel className={'firmware-update-error-panel'}>
      <ErrorHeader>
        <Trans
          i18nKey={'device-manager.errors.update-error-' + component.type}
          components={[<a></a>]}
          values={{
            error: component.errorData.error.message,
            from_version: component.errorData.from_version,
            to_version: component.errorData.to_version,
          }}
        />
      </ErrorHeader>
      <button type="button" className="close" onClick={() => component.clearError()}>
        <span aria-hidden="true">&times;</span>
      </button>
    </ErrorPanel>
  );
});

const CurrentFirmwarePanel = observer(({ firmware, onUpdate }) => {
  if (firmware.hasUpdate) {
    return <NewEmbeddedSoftwareComponentWarning component={firmware} onUpdate={onUpdate} />;
  }
  if (firmware.current) {
    return <ActualFirmwarePanel firmwareVersion={firmware.current} />;
  }
  return null;
});

const EmbeddedSoftwarePanel = observer(
  ({ embeddedSoftware, onUpdateFirmware, onUpdateBootloader }) => {
    if (embeddedSoftware.bootloader.isUpdating) {
      return <EmbeddedSoftwareUpdatePanel component={embeddedSoftware.bootloader} />;
    }
    if (embeddedSoftware.firmware.isUpdating) {
      return <EmbeddedSoftwareUpdatePanel component={embeddedSoftware.firmware} />;
    }
    return (
      <>
        <EmbeddedSoftwareComponentUpdateError component={embeddedSoftware.bootloader} />
        <EmbeddedSoftwareComponentUpdateError component={embeddedSoftware.firmware} />
        {embeddedSoftware.bootloader.hasUpdate && (
          <NewEmbeddedSoftwareComponentWarning
            component={embeddedSoftware.bootloader}
            onUpdate={onUpdateBootloader}
          />
        )}
        <CurrentFirmwarePanel firmware={embeddedSoftware.firmware} onUpdate={onUpdateFirmware} />
      </>
    );
  }
);

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
    onUpdateBootloader,
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
        <EmbeddedSoftwarePanel
          embeddedSoftware={tab.embeddedSoftware}
          onUpdateFirmware={onUpdateFirmware}
          onUpdateBootloader={onUpdateBootloader}
        />
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
