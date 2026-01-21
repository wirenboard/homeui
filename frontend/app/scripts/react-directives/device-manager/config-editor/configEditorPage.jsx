import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { DeviceTab, DeviceTabContent } from '@/pages/settings/device-manager';
import { Button } from '../../common';
import ConfirmModal from '../../components/modals/confirmModal';
import FormModal from '../../components/modals/formModal';
import { SelectModal } from '../../components/modals/selectModal';
import { PageWrapper, PageBody, PageTitle } from '../../components/page-wrapper/pageWrapper';
import { VerticalTabs, TabContent, TabItem, TabPane, TabsList } from '../../components/tabs/tabs';
import { PortTab, PortTabContent } from './portTab';
import { SettingsTab, SettingsTabContent } from './settingsPage';
import { TabType } from './tabsStore';

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
  onReadRegisters
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
  onReadRegisters
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
          onReadRegisters
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
            onReadRegisters
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
  return (
    <PageWrapper
      error={pageStore.pageWrapperStore.error}
      className={classNames('device-manager-page', { mobile: pageStore.tabs.mobileModeStore.inMobileMode })}
      accessLevelStore={pageStore.accessLevelStore}
    >
      <SelectModal {...pageStore.selectModalState} />
      <ConfirmModal {...pageStore.confirmModalState} />
      <FormModal {...pageStore.formModalState} />
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
          />
        )}
      </PageBody>
    </PageWrapper>
  );
});

export default ConfigEditorPage;
