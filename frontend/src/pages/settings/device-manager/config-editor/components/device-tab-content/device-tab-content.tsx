import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CopyIcon from '@/assets/icons/copy.svg';
import RefreshIcon from '@/assets/icons/refresh.svg';
import SettingsIcon from '@/assets/icons/settings.svg';
import SpinnerIcon from '@/assets/icons/spinner.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import { OptionalParamsSelectDialog } from '@/components/json-schema-editor';
import { Loader } from '@/components/loader';
import { Popup } from '@/components/popup';
import { Tooltip } from '@/components/tooltip';
import { EmbeddedSoftwarePanel, DeviceSettingsEditor } from '@/pages/settings/device-manager';
import { UnknownDeviceTabContent } from '../unknown-device-tab';
import { ReadRegistersResultAlert } from './read-registers-result-alert';
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
    deviceTypeSelectOptions,
    isUserDefinedType,
    onDeleteTab,
    onCopyTab,
    onDeviceTypeChange,
    onSetUniqueMqttTopic,
    onSearchDisconnectedDevice,
    onUpdateFirmware,
    onUpdateBootloader,
    onUpdateComponents,
    onReadRegisters,
    onDeleteTemplate,
    onUploadTemplate,
    templateOperationPending,
    templateError,
    onClearTemplateError,
  }: DeviceTabContentProps) => {
    const [optionalParamsSelectDialogIsOpen, openOptionalParamsSelectDialog] = useState(false);
    const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
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
        <ReadRegistersResultAlert tab={tab} onDeviceTypeChange={onDeviceTypeChange} onReadRegisters={onReadRegisters} />
        <div className="deviceTab-contentHeader">
          <div className="deviceTab-typeGroup">
            <Dropdown
              options={deviceTypeSelectOptions}
              value={tab.deviceType}
              className="deviceTab-contentHeaderSelect"
              isSearchable={true}
              onChange={(option: Option<string>) => onDeviceTypeChange(tab, option.value)}
            />
            {onUploadTemplate && (
              <Popup
                className="deviceTab-templateMenu"
                isOpen={isTemplateMenuOpen}
                placement="bottom-end"
                content={
                  <ul className="deviceTab-templateMenuList">
                    <li>
                      <button
                        className="deviceTab-templateMenuItem"
                        onClick={() => {
                          setIsTemplateMenuOpen(false); onUploadTemplate();
                        }}
                      >
                        {t('device-manager.buttons.upload-template')}
                      </button>
                    </li>
                    {isUserDefinedType && onDeleteTemplate && (
                      <li>
                        <button
                          className="deviceTab-templateMenuItem deviceTab-templateMenuItem--danger"
                          onClick={() => {
                            setIsTemplateMenuOpen(false); onDeleteTemplate();
                          }}
                        >
                          {t('device-manager.buttons.delete-template')}
                        </button>
                      </li>
                    )}
                  </ul>
                }
                onOpenChange={setIsTemplateMenuOpen}
              >
                <button
                  className="deviceTab-templateMenuBtn"
                  disabled={templateOperationPending}
                >
                  {templateOperationPending && (
                    <SpinnerIcon className="deviceTab-templateMenuBtnSpinner" />
                  )}
                  {t('device-manager.buttons.template-actions')}
                </button>
              </Popup>
            )}
          </div>
          <div className="deviceTab-contentHeaderButtons">
            {!tab.withSubdevices && tab.readRegistersState.allowEditSettings && (
              <Tooltip text={t('device-manager.buttons.parameters')}>
                <Button
                  aria-label={t('device-manager.buttons.parameters')}
                  variant="secondary"
                  icon={<SettingsIcon />}
                  aria-haspopup="dialog"
                  onClick={() => openOptionalParamsSelectDialog(!optionalParamsSelectDialogIsOpen)}
                />
              </Tooltip>
            )}
            <Tooltip text={t('device-manager.buttons.delete')}>
              <Button
                aria-label={t('device-manager.buttons.delete')}
                icon={<TrashIcon />}
                variant="danger"
                aria-haspopup="dialog"
                onClick={onDeleteTab}
              />
            </Tooltip>
            {!tab.withSubdevices && tab.readRegistersState.allowEditSettings && (
              <Tooltip text={t('device-manager.buttons.copy')}>
                <Button
                  aria-label={t('device-manager.buttons.copy')}
                  icon={<CopyIcon />}
                  aria-haspopup="dialog"
                  onClick={onCopyTab}
                />
              </Tooltip>
            )}
            <Tooltip text={t('device-manager.buttons.reread-config')}>
              <Button
                aria-label={t('device-manager.buttons.reread-config')}
                icon={<RefreshIcon />}
                aria-haspopup="dialog"
                onClick={() => onReadRegisters(tab, true)}
              />
            </Tooltip>
          </div>
        </div>
        {!!templateError && (
          <Alert variant="danger" size="small" onClose={onClearTemplateError}>{templateError}</Alert>
        )}
        {tab.schemaStore && tab.readRegistersState.allowEditSettings && (
          <DeviceSettingsEditor store={tab.schemaStore} translator={tab.schemaStore.schemaTranslator} />
        )}
      </div>
    );
  },
);
