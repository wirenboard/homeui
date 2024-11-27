import React from 'react';
import { Button } from '../../common';
import { PageWrapper, PageBody, PageTitle } from '../../components/page-wrapper/pageWrapper';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { VerticalTabs, TabContent, TabItem, TabPane, TabsList } from '../../components/tabs/tabs';
import { SelectModal } from '../../components/modals/selectModal';
import ConfirmModal from '../../components/modals/confirmModal';
import { TabType } from './tabsStore';
import { PortTab, PortTabContent } from './portTab';
import { DeviceTab, DeviceTabContent } from './deviceTab';
import { SettingsTab, SettingsTabContent } from './settingsPage';
import FormModal from '../../components/modals/formModal';

function getTabItemContent(tab) {
  if (tab.type == TabType.PORT) {
    return <PortTab tab={tab} />;
  }
  if (tab.type == TabType.SETTINGS) {
    return <SettingsTab tab={tab} />;
  }
  if (tab.type == TabType.DEVICE) {
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
  onUpdateBootloader
) {
  if (tab.type == TabType.PORT) {
    return <PortTabContent tab={tab} index={index} onDeletePortDevices={onDeletePortDevices} />;
  }
  if (tab.type == TabType.DEVICE) {
    return (
      <DeviceTabContent
        tab={tab}
        index={index}
        onDeleteTab={onDeleteTab}
        onCopyTab={onCopyTab}
        deviceTypeSelectOptions={deviceTypeSelectOptions}
        onDeviceTypeChange={onDeviceTypeChange}
        onSetUniqueMqttTopic={() => tab.setUniqueMqttTopic()}
        onSearchDisconnectedDevice={onSearchDisconnectedDevice}
        onUpdateFirmware={onUpdateFirmware}
        onUpdateBootloader={onUpdateBootloader}
        onDeletePortDevices={onDeletePortDevices}
      />
    );
  }
  if (tab.type == TabType.SETTINGS) {
    return <SettingsTabContent tab={tab} index={index} />;
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
  onUpdateBootloader
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
          onUpdateBootloader
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
  }) => {
    const { t } = useTranslation();
    return (
      <VerticalTabs selectedIndex={selectedIndex} onSelect={onSelect} className="device-settings">
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
              additionalStyles={'add-port-button'}
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
            onUpdateBootloader
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
      type="success"
      label={t('device-manager.buttons.save')}
      onClick={onClick}
      disabled={disabled}
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
        onClick={onAddWbDevice}
        disabled={!allowAddDevice}
      />
      <Button
        label={t('device-manager.buttons.add-custom-device')}
        onClick={onAddDevice}
        disabled={!allowAddDevice}
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
            <SaveSettingsButton onClick={onSave} disabled={!allowSave} />
            <AddDevicesButtonsPanel
              onAddDevice={onAddDevice}
              onAddWbDevice={onAddWbDevice}
              allowAddDevice={allowAddDevice}
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
          onAddDevice={onAddDevice}
          onAddWbDevice={onAddWbDevice}
          allowAddDevice={allowAddDevice}
        />
        <SaveSettingsButton onClick={onSave} disabled={!allowSave} />
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
            onSave={onSave}
            onAddDevice={onAddDevice}
            onAddWbDevice={onAddWbDevice}
            mobileModeStore={mobileModeStore}
          />
        )}
      </PageTitle>
    );
  }
);

const ConfigEditorPage = observer(({ pageStore, onAddWbDevice, onSearchDisconnectedDevice }) => {
  return (
    <PageWrapper
      error={pageStore.pageWrapperStore.error}
      className="device-manager-page"
      accessLevelStore={pageStore.accessLevelStore}
    >
      <SelectModal {...pageStore.selectModalState} />
      <ConfirmModal {...pageStore.confirmModalState} />
      <FormModal {...pageStore.formModalState} />
      <PageHeader
        showButtons={!pageStore.pageWrapperStore.loading && pageStore.loaded}
        allowSave={pageStore.allowSave}
        allowAddDevice={pageStore.tabs.hasPortTabs}
        onSave={() => pageStore.save()}
        onAddDevice={() => pageStore.addDevice()}
        onAddWbDevice={onAddWbDevice}
        mobileModeStore={pageStore.tabs.mobileModeStore}
      />
      <PageBody loading={pageStore.pageWrapperStore.loading}>
        {!pageStore.tabs.isEmpty && (
          <PageTabs
            tabs={pageStore.tabs.items}
            selectedIndex={pageStore.tabs.selectedTabIndex}
            onSelect={(index, lastIndex) => pageStore.tabs.onSelectTab(index, lastIndex)}
            onDeleteTab={() => pageStore.deleteTab()}
            onDeletePortDevices={tab => pageStore.deletePortDevices(tab)}
            onCopyTab={() => pageStore.copyTab()}
            onAddPort={() => pageStore.addPort()}
            showButtons={!pageStore.pageWrapperStore.loading && pageStore.loaded}
            deviceTypeSelectOptions={pageStore.deviceTypesStore.deviceTypeSelectOptions}
            onDeviceTypeChange={(tab, type) => pageStore.changeDeviceType(tab, type)}
            mobileModeStore={pageStore.tabs.mobileModeStore}
            onSearchDisconnectedDevice={onSearchDisconnectedDevice}
            onUpdateFirmware={() => pageStore.updateFirmware()}
            onUpdateBootloader={() => pageStore.updateBootloader()}
          />
        )}
      </PageBody>
    </PageWrapper>
  );
});

export default ConfigEditorPage;
