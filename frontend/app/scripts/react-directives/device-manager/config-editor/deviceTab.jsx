import { Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation, Trans } from 'react-i18next';
import {
  Button,
  ErrorBar,
  Spinner,
  WarningBar,
  WarningHeader,
  WarningPanel,
  ErrorPanel,
  ErrorHeader
} from '../../common';
import JsonEditor from '../../components/json-editor/jsonEditor';
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
  options.find((option) => {
    if (option?.options) {
      res = option.options.find((option) => option.value === value);
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
  let label;
  const vars = {
    current: component.current,
    available: component.available,
  }
  if (component.type === 'firmware') {
    label = 'device-manager.labels.updating-firmware';
  } else if (component.type === 'bootloader') {
    label = 'device-manager.labels.updating-bootloader';
  } else {
    label = 'device-manager.labels.updating-component';
    vars.model = component.model;
    vars.maybe_current_firmware  = component.current ? 
      t('device-manager.labels.component_update_current_version', vars) : '';
  }
  return (
    <WarningPanel className="firmware-update-panel">
      <WarningHeader>
        <span>{t(label, vars)}</span>
      </WarningHeader>
      <UpdateProgressBar progress={component.updateProgress} />
      <span>
        <b>{t('device-manager.labels.update-firmware-notice')}</b>
      </span>
    </WarningPanel>
  );
});

const FirmwareVersionPanel = observer(({ firmwareVersion, isActual }) => {
  const { t } = useTranslation();
  return (
    <div className="firmware-version-panel">
      <b>
        {t(
          isActual
            ? 'device-manager.labels.actual-firmware'
            : 'device-manager.labels.current-firmware',
          {
            firmware: firmwareVersion,
          }
        )}
      </b>
    </div>
  );
});

const NewComponentSoftwareText = observer(({ components, label, link_label }) => {
  return Array.from(components)
    .map(([key, component]) => {
      const { t } = useTranslation();
      const componentTransKey = !component.model ? label : link_label;
      const maybe_current_firmware = component.current ? 
        t('device-manager.labels.component_current_version', { current_firmware: component.current }) : '';
      return (
        <Fragment key={'component' + key}>
          <span>
            &emsp;&nbsp;-&nbsp;
            <Trans i18nKey={componentTransKey} values={{
              ['device_model']: component.model,
              [`maybe_current_firmware`]: maybe_current_firmware,
              [`available_firmware`]: component.available
            }} components={[<a></a>]} />
          </span>
          <br />
        </Fragment>
      );
    })

});

const NewEmbeddedSoftwareText = observer(({ embeddedSoftware }) => {
  const { t } = useTranslation();
  const values = {
    current_firmware: embeddedSoftware.firmware?.current,
    available_firmware: embeddedSoftware.firmware?.available,
    current_bootloader: embeddedSoftware.bootloader?.current,
    available_bootloader: embeddedSoftware.bootloader?.available,
    device_model: embeddedSoftware.deviceModel,
  };
  const hasComponentsUpdates = embeddedSoftware.hasComponentsUpdates;
  const hasBootloaderUpdate = embeddedSoftware.bootloader.hasUpdate;
  const hasFirmwareUpdate = embeddedSoftware.firmware.hasUpdate;
  const updatesCount = [hasBootloaderUpdate, hasFirmwareUpdate, hasComponentsUpdates].filter(Boolean).length;

  if (updatesCount > 1) {
    const firmwareTransKey = !embeddedSoftware.deviceModel
      ? 'device-manager.labels.new-firmware-item'
      : 'device-manager.labels.new-firmware-item-link';

    return (
      <>
        <span>{t('device-manager.labels.new-software-components')}</span>
        <br />
        {hasBootloaderUpdate && (
          <Fragment key={'bootloader'}>
            <span>
              &emsp;&nbsp;-&nbsp;
              {t('device-manager.labels.new-bootloader-item', values)}
            </span>
            <br />
          </Fragment>
        )}
        {hasFirmwareUpdate && (
          <Fragment key={'firmware'}>
            <span>
              &emsp;&nbsp;-&nbsp;
              <Trans i18nKey={firmwareTransKey} values={values} components={[<a></a>]} />
            </span>
            <br />
          </Fragment>
        )}
        {hasComponentsUpdates && (
          <NewComponentSoftwareText
            components={embeddedSoftware.componentsCanBeUpdated}
            label='device-manager.labels.new-component-item'
            link_label='device-manager.labels.new-component-item-link'
          />
        )}
      </>
    );
  }

  if (hasBootloaderUpdate) {
    return <span>{t('device-manager.labels.new-bootloader', values)}</span>;
  }
  if (hasFirmwareUpdate) {
    const transKey = !embeddedSoftware.deviceModel
      ? 'device-manager.labels.new-firmware'
      : 'device-manager.labels.new-firmware-link';
    return (
      <span>
        <Trans i18nKey={transKey} values={values} components={[<a></a>]} />
      </span>
    );
  }
  if (hasComponentsUpdates) {
    return (
      <>
        <span>{t('device-manager.labels.new-components')}</span>
        <br />
        <NewComponentSoftwareText
          components={embeddedSoftware.componentsCanBeUpdated}
          label='device-manager.labels.new-component'
          link_label='device-manager.labels.new-component-link'
        />
      </>
    );
  }
  return null;
});


const NewEmbeddedSoftwareErasesSettingsText = observer(({ embeddedSoftware }) => {
  const { t } = useTranslation();
  // if only components has updates not show erase settings warning
  if (embeddedSoftware.hasComponentsUpdates && !embeddedSoftware.bootloader.hasUpdate && !embeddedSoftware.firmware.hasUpdate) {
    return null;
  }
  if (!embeddedSoftware.canUpdate || embeddedSoftware.bootloaderCanSaveSettings) {
    return null;
  }
  return (
    <>
      <div style={{ width: '100%' }} />
      <b>{t('device-manager.labels.erase-settings-notice')}</b>
    </>
  );
});

const NewEmbeddedSoftwareManualUpdateText = observer(({ embeddedSoftware }) => {
  // if only components has updates not show manual update instruction
  if (embeddedSoftware.hasComponentsUpdates && !embeddedSoftware.bootloader.hasUpdate && !embeddedSoftware.firmware.hasUpdate) {
    return null;
  }
  if (embeddedSoftware.canUpdate) {
    return null;
  }
  return (
    <span>
      {embeddedSoftware.bootloader.hasUpdate && embeddedSoftware.firmware.hasUpdate && <br />}
      <Trans i18nKey="device-manager.labels.manual-update" components={[<a></a>]} />
    </span>
  );
});

const NewEmbeddedSoftwareWarning = observer(
  ({ embeddedSoftware, onUpdateFirmware, onUpdateBootloader, onUpdateComponents }) => {
    const { t } = useTranslation();
    if (!embeddedSoftware.hasUpdate) {
      return null;
    }

    let onClickFunction = null;
    if (embeddedSoftware.bootloader.hasUpdate) {
      onClickFunction = onUpdateBootloader;
    } else if (embeddedSoftware.firmware.hasUpdate) {
      onClickFunction = onUpdateFirmware;
    } else {
      onClickFunction = onUpdateComponents;
    }

    return (
      <WarningPanel className="new-embedded-software-warning">
        <WarningHeader>
          <NewEmbeddedSoftwareText embeddedSoftware={embeddedSoftware} />
          <NewEmbeddedSoftwareManualUpdateText embeddedSoftware={embeddedSoftware} />
          <NewEmbeddedSoftwareErasesSettingsText embeddedSoftware={embeddedSoftware} />
        </WarningHeader>
        {embeddedSoftware.canUpdate && (
          <Button
            label={t('device-manager.buttons.update')}
            type="warning"
            onClick={onClickFunction}
          />
        )}
      </WarningPanel>
    );
  }
);

function getErrorDescriptionKey(type, errorId) {
  const idToKey = new Map([
    ['com.wb.device_manager.download_error', 'download'],
    ['com.wb.device_manager.rpc_call_timeout_error', 'rpc-timeout'],
    ['com.wb.device_manager.device.response_timeout_error', 'recoverable'],
  ]);
  const genericException = type === 'component' ? 'generic' : 'generic-component';
  const key = idToKey.get(errorId) || genericException;
  return 'device-manager.errors.update-error-' + key;
}

const EmbeddedSoftwareComponentUpdateError = observer(({ component }) => {
  const { t } = useTranslation();
  if (!component.hasError) {
    return null;
  }
  const errorPrefix = t(`device-manager.errors.update-error-${component.type}`, {
    model: component.model,
    from_version: component.errorData.from_version,
    to_version: component.errorData.to_version,
  });
  const errorDescription = t(getErrorDescriptionKey(component.errorData.error.id), {
    error: component.errorData.error.metadata?.exception || component.errorData.error.message,
  });

  return (
    <ErrorPanel className="firmware-update-error-panel">
      <ErrorHeader>{`${errorPrefix} ${errorDescription}`}</ErrorHeader>
      <button type="button" className="close" onClick={() => component.clearError()}>
        <span aria-hidden="true">&times;</span>
      </button>
    </ErrorPanel>
  );
});

const CurrentFirmwarePanel = observer(({ firmware }) => {
  if (firmware.hasUpdate || !firmware.current) {
    return null;
  }
  return <FirmwareVersionPanel firmwareVersion={firmware.current} isActual={firmware.isActual} />;
});

const EmbeddedSoftwarePanel = observer(
  ({ embeddedSoftware, onUpdateFirmware, onUpdateBootloader, onUpdateComponents }) => {
    if (embeddedSoftware.bootloader.isUpdating) {
      return <EmbeddedSoftwareUpdatePanel component={embeddedSoftware.bootloader} />;
    }
    if (embeddedSoftware.firmware.isUpdating) {
      return <EmbeddedSoftwareUpdatePanel component={embeddedSoftware.firmware} />;
    }
    for (const component of embeddedSoftware.components.values()) {
      if (component.isUpdating) {
        return <EmbeddedSoftwareUpdatePanel component={component} />;
      }
    }
    return (
      <>
        <EmbeddedSoftwareComponentUpdateError key={'bootloader'} component={embeddedSoftware.bootloader} />
        <EmbeddedSoftwareComponentUpdateError key={'firmware'} component={embeddedSoftware.firmware} />
        {Array.from(embeddedSoftware.components).map(([key,component]) => (
          <EmbeddedSoftwareComponentUpdateError key={'component ' + key} component={component} />
        ))}
        <NewEmbeddedSoftwareWarning
          embeddedSoftware={embeddedSoftware}
          onUpdateBootloader={onUpdateBootloader}
          onUpdateFirmware={onUpdateFirmware}
          onUpdateComponents={onUpdateComponents}
        />
        <CurrentFirmwarePanel firmware={embeddedSoftware.firmware} />
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
  if (devicesWithTheSameId.length) {
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
    onUpdateComponents
  }) => {
    const { t } = useTranslation();
    if (tab.loading) {
      return <Spinner />;
    }
    if (tab.isUnknownType) {
      return <UnknownDeviceTabContent tab={tab} onDeleteTab={onDeleteTab} />;
    }
    const selectedDeviceType = findDeviceTypeSelectOption(deviceTypeSelectOptions, tab.deviceType);
    return (
      <div>
        {tab.error && <ErrorBar msg={tab.error} />}
        <DeprecatedWarning isDeprecated={tab.isDeprecated} />
        <EmbeddedSoftwarePanel
          embeddedSoftware={tab.embeddedSoftware}
          onUpdateFirmware={onUpdateFirmware}
          onUpdateBootloader={onUpdateBootloader}
          onUpdateComponents={onUpdateComponents}
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
          className="pull-left device-type-select"
          onChange={(option) => onDeviceTypeChange(tab, option.value)}
        />
        <div className="pull-right button-group">
          <Button label={t('device-manager.buttons.delete')} type="danger" onClick={onDeleteTab} />
          <Button label={t('device-manager.buttons.copy')} onClick={onCopyTab} />
        </div>
        <JsonEditor
          schema={tab.schema}
          data={tab.editedData}
          root={'dev' + index}
          className="device-tab-properties"
          onChange={tab.setData}
        />
      </div>
    );
  }
);
