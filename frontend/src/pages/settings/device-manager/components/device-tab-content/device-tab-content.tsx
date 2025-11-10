import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Dropdown, Option } from '@/components/dropdown';
import { OptionalParamsSelectDialog } from '@/components/json-schema-editor';
import { Loader } from '@/components/loader';
import { DeviceSettingsEditor } from '../../components/device-settings-editor/device-settings-editor';
import { EmbeddedSoftwarePanel } from '../../components/embedded-software-panel/embedded-software-panel';
import { UnknownDeviceTabContent } from '../../components/unknown-device-tab/unknown-device-tab';
import { BetterTemplatesAlert } from './better-template-alert';
import type { DeviceTabContentProps } from './types';
import './styles.css';

const SubdevicesWarning = () => {
  const { t } = useTranslation();
  return <Alert variant="warn">{t('device-manager.errors.with-subdevices')}</Alert>;
};

const DuplicateSlaveIdError = () => {
  const { t } = useTranslation();
  return <Alert variant="danger">{t('device-manager.errors.duplicate-slave-id')}</Alert>;
};

const SameMqttIdError = ({ devicesWithTheSameId, onSetUniqueMqttTopic }) => {
  const { t } = useTranslation();
  return (
    <Alert variant="danger" className="alert-withButton">
      <span>
        {t('device-manager.errors.duplicate-mqtt-topic', {
          device: devicesWithTheSameId.join(', '),
          interpolation: { escapeValue: false },
        })}
      </span>
      <Button
        label={t('device-manager.buttons.resolve-duplicate-mqtt-topic')}
        variant="danger"
        onClick={onSetUniqueMqttTopic}
      />
    </Alert>
  );
};

const DisconnectedError = ({ isWbDevice, onSearchDisconnectedDevice }) => {
  const { t } = useTranslation();
  return (
    <Alert variant="danger" className="alert-withButton">
      <span>
        {t('device-manager.errors.is-disconnected')}
      </span>
      {isWbDevice && (
        <Button
          label={t('device-manager.buttons.search-disconnected-device')}
          variant="danger"
          onClick={onSearchDisconnectedDevice}
        />
      )}
    </Alert>
  );
};

const LoaderPanel = ({ message }: { message: string }) => {
  return (
    <div className="deviceTab-loader">
      <Loader />
      <span>{message}</span>
    </div>
  );
};

export const DeviceTabContent = observer(
  ({
    tab,
    onDeleteTab,
    onCopyTab,
    deviceTypeSelectOptions,
    onDeviceTypeChange,
    onSetUniqueMqttTopic,
    onSearchDisconnectedDevice,
    onUpdateFirmware,
    onUpdateBootloader,
    onUpdateComponents,
  }: DeviceTabContentProps) => {
    const [optionalParamsSelectDialogIsOpen, openOptionalParamsSelectDialog] = useState(false);
    const { t } = useTranslation();
    if (tab.isLoading) {
      return <LoaderPanel message={tab.loadingMessage} />;
    }
    if (tab.isUnknownType) {
      return <UnknownDeviceTabContent tab={tab} onDeleteTab={onDeleteTab} />;
    }
    return (
      <div className="deviceTab-content">
        {tab.schemaStore && (
          <OptionalParamsSelectDialog
            isOpened={optionalParamsSelectDialogIsOpen}
            store={tab.schemaStore.commonParams}
            translator={tab.schemaStore.schemaTranslator}
            onClose={() => openOptionalParamsSelectDialog(false)}
          />
        )}
        {tab.error && (
          <Alert variant="danger">{tab.error}</Alert>
        )}
        {tab.withSubdevices && (
          <SubdevicesWarning />
        )}
        <EmbeddedSoftwarePanel
          embeddedSoftware={tab.embeddedSoftware}
          onUpdateFirmware={onUpdateFirmware}
          onUpdateBootloader={onUpdateBootloader}
          onUpdateComponents={onUpdateComponents}
        />
        {tab.showDisconnectedError && (
          <DisconnectedError
            isWbDevice={tab.isWbDevice}
            onSearchDisconnectedDevice={onSearchDisconnectedDevice}
          />
        )}
        {tab.slaveIdIsDuplicate && (
          <DuplicateSlaveIdError />
        )}
        {!!tab.devicesWithTheSameId.length && (
          <SameMqttIdError
            devicesWithTheSameId={tab.devicesWithTheSameId}
            onSetUniqueMqttTopic={onSetUniqueMqttTopic}
          />
        )}
        {!tab.withSubdevices && (
          <BetterTemplatesAlert
            tab={tab}
            onDeviceTypeChange={onDeviceTypeChange}
          />
        )}
        <div className="deviceTab-contentHeader">
          <Dropdown
            options={deviceTypeSelectOptions}
            value={tab.deviceType}
            className="deviceTab-contentHeaderSelect"
            isSearchable={true}
            onChange={(option: Option<string>) => onDeviceTypeChange(tab, option.value)}
          />
          <div className="deviceTab-contentHeaderButtons">
            {!tab.withSubdevices && tab.matchingTemplatesStore.allowEditSettings && (
              <Button
                label={t('device-manager.buttons.parameters')}
                onClick={() => openOptionalParamsSelectDialog(!optionalParamsSelectDialogIsOpen)}
              />
            )}
            <Button label={t('device-manager.buttons.delete')} variant="danger" onClick={onDeleteTab} />
            {!tab.withSubdevices && tab.matchingTemplatesStore.allowEditSettings && (
              <Button
                label={t('device-manager.buttons.copy')}
                onClick={onCopyTab}
              />
            )}
          </div>
        </div>
        {tab.schemaStore && tab.matchingTemplatesStore.allowEditSettings && (
          <DeviceSettingsEditor store={tab.schemaStore} translator={tab.schemaStore.schemaTranslator} />
        )}
      </div>
    );
  }
);
