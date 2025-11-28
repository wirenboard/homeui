import { observer } from 'mobx-react-lite';
import { Fragment } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import {
  EmbeddedSoftware,
  EmbeddedSoftwareComponent,
  ComponentFirmware
} from '@/stores/device-manager';
import type { EmbeddedSoftwarePanelProps, HasUpdateAlertProps } from './types';

import './styles.css';

const UpdateProgressBar = observer(({ progress } : { progress: number }) => {
  return (
    <div className="progress">
      <div
        className="progress-bar progress-bar-striped active"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ width: progress + '%' }}
      >
        {progress + '%'}
      </div>
    </div>
  );
});

const UpdateProgressPanel = observer(
  ({ component } : { component: EmbeddedSoftwareComponent | ComponentFirmware }) => {
    const { t } = useTranslation();
    let label: string;
    let vars : Record<string, any> = {
      current: component.current,
      available: component.available,
    };
    if (component.type === 'firmware') {
      label = 'device-manager.labels.updating-firmware';
    } else if (component.type === 'bootloader') {
      label = 'device-manager.labels.updating-bootloader';
    } else {
      label = 'device-manager.labels.updating-component';
      vars.model = (component as ComponentFirmware).model;
      vars.maybe_current_firmware = component.current ?
        t('device-manager.labels.component_update_current_version', vars) : '';
    }
    return (
      <Alert variant="warn" className="updateProgressAlert">
        <span>{t(label, vars)}</span>
        <UpdateProgressBar progress={component.updateProgress} />
        <span>
          <b>{t('device-manager.labels.update-firmware-notice')}</b>
        </span>
      </Alert>
    );
  });

const FirmwareVersionPanel = observer(
  ({ firmwareVersion, isActual } : { firmwareVersion: string; isActual: boolean }) => {
    const { t } = useTranslation();
    return (
      <div className="firmwareVersionPanel">
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

const AvailableComponentUpdatesText = observer(
  ({
    components,
    label,
    linkLabel,
  } : {
    components: Map<number, ComponentFirmware>;
    label: string;
    linkLabel: string;
  }) => {
    return Array.from(components)
      .map(([key, component]) => {
        const { t } = useTranslation();
        const componentTransKey = !component.model ? label : linkLabel;
        const maybeCurrentFirmware = component.current ?
          t('device-manager.labels.component_current_version', { current_firmware: component.current }) : '';
        return (
          <Fragment key={'component' + key}>
            <span>
            &emsp;&nbsp;-&nbsp;
              <Trans
                i18nKey={componentTransKey}
                values={{
                  device_model: component.model,
                  maybe_current_firmware: maybeCurrentFirmware,
                  available_firmware: component.available,
                }}
                components={[<a></a>]}
              />
            </span>
            <br />
          </Fragment>
        );
      });
  });

const AvailableUpdatesText = observer(({ embeddedSoftware } : { embeddedSoftware: EmbeddedSoftware }) => {
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
          <Fragment key="bootloader">
            <span>
              &emsp;&nbsp;-&nbsp;
              <Trans i18nKey="device-manager.labels.new-bootloader-item" values={values} components={[<a></a>]} />
            </span>
            <br />
          </Fragment>
        )}
        {hasFirmwareUpdate && (
          <Fragment key="firmware">
            <span>
              &emsp;&nbsp;-&nbsp;
              <Trans i18nKey={firmwareTransKey} values={values} components={[<a></a>]} />
            </span>
            <br />
          </Fragment>
        )}
        {hasComponentsUpdates && (
          <AvailableComponentUpdatesText
            components={embeddedSoftware.componentsCanBeUpdated}
            label="device-manager.labels.new-component-item"
            linkLabel="device-manager.labels.new-component-item-link"
          />
        )}
      </>
    );
  }

  if (hasBootloaderUpdate) {
    return (
      <span>
        <Trans i18nKey="device-manager.labels.new-bootloader" values={values} components={[<a></a>]} />
      </span>
    );
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
        <AvailableComponentUpdatesText
          components={embeddedSoftware.componentsCanBeUpdated}
          label="device-manager.labels.new-component"
          linkLabel="device-manager.labels.new-component-link"
        />
      </>
    );
  }
  return null;
});

const UpdateErasesSettingsText = observer(
  ({ embeddedSoftware } : { embeddedSoftware: EmbeddedSoftware }) => {
    const { t } = useTranslation();
    // if only components has updates not show erase settings warning
    if (embeddedSoftware.hasComponentsUpdates &&
        !embeddedSoftware.bootloader.hasUpdate &&
        !embeddedSoftware.firmware.hasUpdate) {
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

const ManualUpdateText = observer(
  ({ embeddedSoftware } : { embeddedSoftware: EmbeddedSoftware }) => {
  // if only components has updates not show manual update instruction
    if (embeddedSoftware.hasComponentsUpdates &&
        !embeddedSoftware.bootloader.hasUpdate &&
        !embeddedSoftware.firmware.hasUpdate) {
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

const HasUpdateAlert = observer(
  ({
    embeddedSoftware,
    onUpdateFirmware,
    onUpdateBootloader,
    onUpdateComponents,
  } : HasUpdateAlertProps) => {
    const { t } = useTranslation();

    let onClickFunction = onUpdateComponents;
    if (embeddedSoftware.bootloader.hasUpdate) {
      onClickFunction = onUpdateBootloader;
    } else if (embeddedSoftware.firmware.hasUpdate) {
      onClickFunction = onUpdateFirmware;
    }

    return (
      <Alert variant="warn" className="hasUpdateAlert">
        <div>
          <AvailableUpdatesText embeddedSoftware={embeddedSoftware} />
          <ManualUpdateText embeddedSoftware={embeddedSoftware} />
          <UpdateErasesSettingsText embeddedSoftware={embeddedSoftware} />
        </div>
        {embeddedSoftware.canUpdate && (
          <Button
            label={t('device-manager.buttons.update')}
            variant="warn"
            onClick={onClickFunction}
          />
        )}
      </Alert>
    );
  }
);

function getErrorDescriptionKey(type: string, errorId: string) {
  const idToKey = new Map([
    ['com.wb.device_manager.download_error', 'download'],
    ['com.wb.device_manager.rpc_call_timeout_error', 'rpc-timeout'],
    ['com.wb.device_manager.device.response_timeout_error', 'recoverable'],
  ]);
  const genericException = type === 'component' ? 'generic-component' : 'generic';
  const key = idToKey.get(errorId) || genericException;
  return 'device-manager.errors.update-error-' + key;
}

const UpdateErrorAlert = observer(({ component } : { component: EmbeddedSoftwareComponent }) => {
  const { t } = useTranslation();
  if (!component.hasError) {
    return null;
  }
  const errorPrefix = t(`device-manager.errors.update-error-${component.type}`, {
    model: component.model,
    from_version: component.errorData.from_version,
    to_version: component.errorData.to_version,
  });
  const errorDescription = t(getErrorDescriptionKey(component.type, component.errorData.error.id), {
    error: component.errorData.error.metadata?.exception || component.errorData.error.message,
  });

  return (
    <Alert variant="danger" className="updateErrorAlert">
      <span>{`${errorPrefix} ${errorDescription}`}</span>
      <button type="button" className="close" onClick={() => component.clearError()}>
        <span aria-hidden="true">&times;</span>
      </button>
    </Alert>
  );
});

export const EmbeddedSoftwarePanel = observer(
  ({ embeddedSoftware, onUpdateFirmware, onUpdateBootloader, onUpdateComponents } : EmbeddedSoftwarePanelProps) => {
    if (embeddedSoftware.bootloader.isUpdating) {
      return <UpdateProgressPanel component={embeddedSoftware.bootloader} />;
    }
    if (embeddedSoftware.firmware.isUpdating) {
      return <UpdateProgressPanel component={embeddedSoftware.firmware} />;
    }
    for (const component of embeddedSoftware.components.values()) {
      if (component.isUpdating) {
        return <UpdateProgressPanel component={component} />;
      }
    }
    return (
      <>
        <UpdateErrorAlert key="bootloader" component={embeddedSoftware.bootloader} />
        <UpdateErrorAlert key="firmware" component={embeddedSoftware.firmware} />
        {Array.from(embeddedSoftware.components.entries()).map(([key, component]) => (
          <UpdateErrorAlert key={'component ' + key} component={component} />
        ))}
        {embeddedSoftware.hasUpdate && (
          <HasUpdateAlert
            embeddedSoftware={embeddedSoftware}
            onUpdateBootloader={onUpdateBootloader}
            onUpdateFirmware={onUpdateFirmware}
            onUpdateComponents={onUpdateComponents}
          />
        )}
        {!embeddedSoftware.firmware.hasUpdate && embeddedSoftware.firmware.current && (
          <FirmwareVersionPanel
            firmwareVersion={embeddedSoftware.firmware.current}
            isActual={embeddedSoftware.firmware.isActual}
          />
        )}
      </>
    );
  }
);
