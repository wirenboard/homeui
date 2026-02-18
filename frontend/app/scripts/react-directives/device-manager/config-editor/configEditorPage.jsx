import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceTab, DeviceTabContent } from '@/pages/settings/device-manager';
import { Button } from '../../common';
import ConfirmModal from '../../components/modals/confirmModal';
import FormModal from '../../components/modals/formModal';
import { SelectModal } from '../../components/modals/selectModal';
import BootstrapLikeSelect from '../../components/select/select';
import { PageWrapper, PageBody, PageTitle } from '../../components/page-wrapper/pageWrapper';
import { VerticalTabs, TabContent, TabItem, TabPane, TabsList } from '../../components/tabs/tabs';
import { CustomEditorBuilderContext, FormEdit } from '../../forms/forms';
import { PortTab, PortTabContent } from './portTab';
import { SettingsTab, SettingsTabContent } from './settingsPage';
import { TabType } from './tabsStore';
import { uploadTemplate, deleteTemplate } from './templateUploadService';

const srOnlyStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const DeviceTypeFieldWithUpload = observer(({ store, deviceTypesStore }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const badgeLabel = t('device-manager.labels.custom-template-badge');

  const formatOptionLabel = (option) => {
    if (deviceTypesStore.isCustom(option.value)) {
      return (
        <span>
          {option.label}
          <span className="deviceTab-customBadge" style={{ marginLeft: 6 }}>{badgeLabel}</span>
        </span>
      );
    }
    return option.label;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    store.setError('');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (typeof json !== 'object' || Array.isArray(json) || !json.device) {
        throw new Error(t('device-manager.errors.invalid-template'));
      }
      const type = file.name.replace(/\.json$/, '');
      const isOverwrite = !deviceTypesStore.isUnknown(type);
      if (isOverwrite) {
        const existingName = deviceTypesStore.getName(type) || type;
        if (!window.confirm(t('device-manager.labels.confirm-overwrite-template', { item: existingName }))) {
          e.target.value = '';
          return;
        }
      }
      setIsUploading(true);
      const result = await uploadTemplate(file);
      const uploadedType = result.filename.replace(/\.json$/, '');
      const name = json?.device?.name || uploadedType;
      const groupLabel = t('device-manager.labels.custom-templates-group');
      deviceTypesStore.addCustomDeviceType(uploadedType, name, groupLabel);
      if (!isOverwrite) {
        await deviceTypesStore.preloadSchema(uploadedType, 5000);
      }
      store.setOptions(deviceTypesStore.deviceTypeDropdownOptions);
      store.setValue(uploadedType);
    } catch (err) {
      store.setError(err.message || t('device-manager.errors.upload-template'));
    } finally {
      setIsUploading(false);
    }
    e.target.value = '';
  };

  return (
    <FormEdit store={store}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <BootstrapLikeSelect
            options={store.options}
            selectedOption={store.selectedOption}
            placeholder={store.placeholder}
            disabled={store.readOnly || isUploading}
            formatOptionLabel={formatOptionLabel}
            onChange={(value) => store.setSelectedOption(value)}
          />
        </div>
        <Button
          label={isUploading ? t('device-manager.buttons.uploading-template') : t('device-manager.buttons.upload-template')}
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          tabIndex={-1}
          style={srOnlyStyle}
          onChange={handleFileSelect}
        />
      </div>
    </FormEdit>
  );
});

function getTabItemContent(tab) {
  if (tab.type === TabType.PORT) {
    return <PortTab tab={tab} />;
  }
  if (tab.type === TabType.SETTINGS) {
    return <SettingsTab tab={tab} />;
  }
  if (tab.type === TabType.DEVICE) {
    return <DeviceTab tab={tab} />;
  }
  return null;
}

function makeTabItems(tabs) {
  return tabs.map((tab, index) => {
    return (
      <TabItem key={index} className={tab?.hidden ? 'hidden' : ''}>
        {getTabItemContent(tab)}
      </TabItem>
    );
  });
}

function getTabPaneContent(
  tab,
  index,
  onDeleteTab,
  onDeletePortDevices,
  onCopyTab,
  deviceTypeSelectOptions,
  onDeviceTypeChange,
  onSearchDisconnectedDevice,
  onUpdateFirmware,
  onUpdateBootloader,
  onUpdateComponents,
  onReadRegisters,
  isCustomDeviceTypeFn,
  onDeleteTemplate
) {
  if (tab.type === TabType.PORT) {
    return (
      <PortTabContent
        tab={tab}
        onDeleteTab={onDeleteTab}
        onDeletePortDevices={onDeletePortDevices}
      />
    );
  }
  if (tab.type === TabType.DEVICE) {
    return (
      <DeviceTabContent
        tab={tab}
        index={index}
        deviceTypeSelectOptions={deviceTypeSelectOptions}
        isCustomDeviceType={isCustomDeviceTypeFn?.(tab.deviceType)}
        isCustomDeviceTypeFn={isCustomDeviceTypeFn}
        onDeleteTab={onDeleteTab}
        onCopyTab={onCopyTab}
        onDeviceTypeChange={onDeviceTypeChange}
        onSetUniqueMqttTopic={() => tab.setUniqueMqttTopic()}
        onSearchDisconnectedDevice={onSearchDisconnectedDevice}
        onUpdateFirmware={onUpdateFirmware}
        onUpdateBootloader={onUpdateBootloader}
        onUpdateComponents={onUpdateComponents}
        onDeletePortDevices={onDeletePortDevices}
        onReadRegisters={onReadRegisters}
        onDeleteTemplate={() => onDeleteTemplate?.(tab.deviceType)}
      />
    );
  }
  if (tab.type === TabType.SETTINGS) {
    return <SettingsTabContent tab={tab} />;
  }
  return null;
}

function makeTabPanes(
  tabs,
  onDeleteTab,
  onDeletePortDevices,
  onCopyTab,
  deviceTypeSelectOptions,
  onDeviceTypeChange,
  onSearchDisconnectedDevice,
  onUpdateFirmware,
  onUpdateBootloader,
  onUpdateComponents,
  onReadRegisters,
  isCustomDeviceTypeFn,
  onDeleteTemplate
) {
  return tabs.map((tab, index) => {
    return (
      <TabPane key={index}>
        {getTabPaneContent(
          tab,
          index,
          onDeleteTab,
          onDeletePortDevices,
          onCopyTab,
          deviceTypeSelectOptions,
          onDeviceTypeChange,
          onSearchDisconnectedDevice,
          onUpdateFirmware,
          onUpdateBootloader,
          onUpdateComponents,
          onReadRegisters,
          isCustomDeviceTypeFn,
          onDeleteTemplate
        )}
      </TabPane>
    );
  });
}

const PageTabs = observer(
  ({
    tabs,
    onSelect,
    selectedIndex,
    onDeleteTab,
    onDeletePortDevices,
    onCopyTab,
    onAddPort,
    showButtons,
    deviceTypeSelectOptions,
    onDeviceTypeChange,
    mobileModeStore,
    onSearchDisconnectedDevice,
    onUpdateFirmware,
    onUpdateBootloader,
    onUpdateComponents,
    onReadRegisters,
    isCustomDeviceTypeFn,
    onDeleteTemplate,
  }) => {
    const { t } = useTranslation();
    return (
      <VerticalTabs selectedIndex={selectedIndex} className="device-settings" onSelect={onSelect}>
        <div
          className={
            mobileModeStore.inMobileMode && !mobileModeStore.tabsPanelIsActive
              ? 'hidden'
              : 'device-list-panel'
          }
        >
          <TabsList className="device-list">{makeTabItems(tabs)}</TabsList>
          {showButtons && (
            <Button
              additionalStyles="add-port-button"
              label={t('device-manager.buttons.add-port')}
              onClick={onAddPort}
            />
          )}
        </div>
        <TabContent
          className={
            mobileModeStore.inMobileMode && mobileModeStore.tabsPanelIsActive
              ? 'hidden'
              : 'settings-panel'
          }
        >
          {makeTabPanes(
            tabs,
            onDeleteTab,
            onDeletePortDevices,
            onCopyTab,
            deviceTypeSelectOptions,
            onDeviceTypeChange,
            onSearchDisconnectedDevice,
            onUpdateFirmware,
            onUpdateBootloader,
            onUpdateComponents,
            onReadRegisters,
            isCustomDeviceTypeFn,
            onDeleteTemplate
          )}
        </TabContent>
      </VerticalTabs>
    );
  }
);

const SaveSettingsButton = ({ onClick, disabled }) => {
  const { t } = useTranslation();
  return (
    <Button
      type="primary"
      label={t('device-manager.buttons.save')}
      disabled={disabled}
      onClick={onClick}
    />
  );
};

const AddDevicesButtonsPanel = ({ allowAddDevice, onAddDevice, onAddWbDevice }) => {
  const { t } = useTranslation();
  return (
    <div className="add-devices-panel">
      <Button
        type="primary"
        label={t('device-manager.buttons.add-wb-device')}
        disabled={!allowAddDevice}
        onClick={onAddWbDevice}
      />
      <Button
        label={t('device-manager.buttons.add-custom-device')}
        disabled={!allowAddDevice}
        onClick={onAddDevice}
      />
    </div>
  );
};

const HeaderButtons = observer(
  ({ allowSave, allowAddDevice, onSave, onAddDevice, onAddWbDevice, mobileModeStore }) => {
    const { t } = useTranslation();
    if (mobileModeStore.inMobileMode) {
      if (mobileModeStore.tabsPanelIsActive) {
        return (
          <>
            <SaveSettingsButton disabled={!allowSave} onClick={onSave} />
            <AddDevicesButtonsPanel
              allowAddDevice={allowAddDevice}
              onAddDevice={onAddDevice}
              onAddWbDevice={onAddWbDevice}
            />
          </>
        );
      }
      return (
        <Button
          label={t('device-manager.buttons.to-port-list')}
          onClick={() => {
            mobileModeStore.showTabsPanel();
          }}
        />
      );
    }
    return (
      <>
        <AddDevicesButtonsPanel
          allowAddDevice={allowAddDevice}
          onAddDevice={onAddDevice}
          onAddWbDevice={onAddWbDevice}
        />
        <SaveSettingsButton disabled={!allowSave} onClick={onSave} />
      </>
    );
  }
);

const PageHeader = observer(
  ({
    showButtons,
    allowSave,
    allowAddDevice,
    onSave,
    onAddDevice,
    onAddWbDevice,
    mobileModeStore,
  }) => {
    const { t } = useTranslation();
    return (
      <PageTitle title={t('device-manager.labels.title')}>
        {showButtons && (
          <HeaderButtons
            allowSave={allowSave}
            allowAddDevice={allowAddDevice}
            mobileModeStore={mobileModeStore}
            onSave={onSave}
            onAddDevice={onAddDevice}
            onAddWbDevice={onAddWbDevice}
          />
        )}
      </PageTitle>
    );
  }
);

const ConfigEditorPage = observer(({ pageStore, onAddWbDevice, onSearchDisconnectedDevice }) => {
  const { t } = useTranslation();

  const customEditorBuilder = useCallback(
    (param, paramName) => {
      if (paramName === 'deviceType') {
        return (
          <DeviceTypeFieldWithUpload
            store={param}
            deviceTypesStore={pageStore.deviceTypesStore}
          />
        );
      }
      return null;
    },
    [pageStore.deviceTypesStore]
  );

  const handleDeleteTemplate = useCallback(
    async (deviceType) => {
      const filename = deviceType + '.json';
      const deviceTabs = pageStore.tabs.items.filter(
        (item) => item.type === 'device' && item.deviceType === deviceType
      );
      const devices = deviceTabs.map((tab) => tab.name).join(', ');
      const templateName = pageStore.deviceTypesStore.getName(deviceType) || deviceType;
      const message = devices
        ? t('device-manager.labels.confirm-delete-template-and-devices', {
            item: templateName,
            devices,
            interpolation: { escapeValue: false },
          })
        : t('device-manager.labels.confirm-delete-template', {
            item: templateName,
            interpolation: { escapeValue: false },
          });
      const confirmed = await pageStore.confirmModalState.show(
        message,
        [{ label: t('device-manager.buttons.delete'), type: 'danger' }]
      );
      if (confirmed !== 'ok') {
        return;
      }
      try {
        await deleteTemplate(filename);
        pageStore.tabs.deleteDevicesByType(deviceType);
        pageStore.deviceTypesStore.removeCustomDeviceType(deviceType);
      } catch (err) {
        pageStore.setError(err.message || t('device-manager.errors.delete-template'));
      }
    },
    [pageStore, t]
  );

  return (
    <PageWrapper
      error={pageStore.pageWrapperStore.error}
      className={classNames('device-manager-page', { mobile: pageStore.tabs.mobileModeStore.inMobileMode })}
      accessLevelStore={pageStore.accessLevelStore}
    >
      <SelectModal {...pageStore.selectModalState} />
      <ConfirmModal {...pageStore.confirmModalState} />
      <CustomEditorBuilderContext.Provider value={customEditorBuilder}>
        <FormModal {...pageStore.formModalState} />
      </CustomEditorBuilderContext.Provider>
      <PageHeader
        showButtons={!pageStore.pageWrapperStore.loading && pageStore.loaded}
        allowSave={pageStore.allowSave}
        allowAddDevice={pageStore.tabs.hasPortTabs}
        mobileModeStore={pageStore.tabs.mobileModeStore}
        onSave={() => pageStore.save()}
        onAddDevice={() => pageStore.addDevice()}
        onAddWbDevice={onAddWbDevice}
      />
      <PageBody loading={pageStore.pageWrapperStore.loading}>
        {!pageStore.tabs.isEmpty && (
          <PageTabs
            tabs={pageStore.tabs.items}
            selectedIndex={pageStore.tabs.selectedTabIndex}
            showButtons={!pageStore.pageWrapperStore.loading && pageStore.loaded}
            deviceTypeSelectOptions={pageStore.deviceTypesStore.deviceTypeDropdownOptions}
            mobileModeStore={pageStore.tabs.mobileModeStore}
            isCustomDeviceTypeFn={(type) => pageStore.deviceTypesStore.isCustom(type)}
            onSelect={(index, lastIndex) => pageStore.tabs.onSelectTab(index, lastIndex)}
            onDeleteTab={() => pageStore.deleteTab()}
            onDeletePortDevices={(tab) => pageStore.deletePortDevices(tab)}
            onCopyTab={() => pageStore.copyTab()}
            onAddPort={() => pageStore.addPort()}
            onDeviceTypeChange={(tab, type) => pageStore.changeDeviceType(tab, type)}
            onSearchDisconnectedDevice={onSearchDisconnectedDevice}
            onUpdateFirmware={() => pageStore.updateFirmware()}
            onUpdateBootloader={() => pageStore.updateBootloader()}
            onUpdateComponents={() => pageStore.updateComponents()}
            onReadRegisters={(tab) => pageStore.readRegisters(tab)}
            onDeleteTemplate={handleDeleteTemplate}
          />
        )}
      </PageBody>
    </PageWrapper>
  );
});

export default ConfigEditorPage;
