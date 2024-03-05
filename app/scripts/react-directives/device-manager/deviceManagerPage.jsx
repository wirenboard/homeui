import React, { useEffect } from 'react';
import { Button } from '../common';
import { PageWrapper, PageBody, PageTitle } from '../components/page-wrapper/pageWrapper';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { VerticalTabs, TabContent, TabItem, TabPane, TabsList } from '../components/tabs/tabs';
import { SelectModal } from '../components/modals/selectModal';
import ConfirmModal from '../components/modals/confirmModal';
import AddDeviceModal from './addDeviceModal';
import { TabType } from './tabsStore';
import { PortTab, PortTabContent } from './portTab';
import { DeviceTab, DeviceTabContent } from './deviceTab';
import { SettingsTab, SettingsTabContent } from './settingsPage';
import { useMediaQuery } from 'react-responsive';

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
  onCopyTab,
  deviceTypeSelectOptions,
  onDeviceTypeChange
) {
  if (tab.type == TabType.PORT) {
    return <PortTabContent tab={tab} index={index} onDeleteTab={onDeleteTab} />;
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
      />
    );
  }
  if (tab.type == TabType.SETTINGS) {
    return <SettingsTabContent tab={tab} index={index} />;
  }
  return null;
}

function makeTabPanes(tabs, onDeleteTab, onCopyTab, deviceTypeSelectOptions, onDeviceTypeChange) {
  return tabs.map((tab, index) => {
    return (
      <TabPane key={index}>
        {getTabPaneContent(
          tab,
          index,
          onDeleteTab,
          onCopyTab,
          deviceTypeSelectOptions,
          onDeviceTypeChange
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
    onCopyTab,
    onAddPort,
    showButtons,
    deviceTypeSelectOptions,
    onDeviceTypeChange,
    mobileModeStore,
  }) => {
    const { t } = useTranslation();
    return (
      <VerticalTabs selectedIndex={selectedIndex} onSelect={onSelect} className={'device-settings'}>
        <div
          className={
            mobileModeStore.inMobileMode && mobileModeStore.activePanel == 'content'
              ? 'hidden'
              : 'device-list-panel'
          }
        >
          <TabsList className={'device-list'}>{makeTabItems(tabs)}</TabsList>
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
            mobileModeStore.inMobileMode && mobileModeStore.activePanel == 'tabs'
              ? 'hidden'
              : 'settings-panel'
          }
        >
          {makeTabPanes(tabs, onDeleteTab, onCopyTab, deviceTypeSelectOptions, onDeviceTypeChange)}
        </TabContent>
      </VerticalTabs>
    );
  }
);

const HeaderButtons = observer(
  ({ allowSave, allowAddDevice, onSave, onAddDevice, mobileModeStore }) => {
    const { t } = useTranslation();
    if (mobileModeStore.inMobileMode && mobileModeStore.activePanel == 'content') {
      return (
        <Button
          label={t('device-manager.buttons.to-port-list')}
          onClick={() => {
            mobileModeStore.setActivePanel('tabs');
          }}
        />
      );
    }
    return (
      <>
        <Button
          type="success"
          label={t('device-manager.buttons.save')}
          onClick={onSave}
          disabled={!allowSave}
        />
        <Button
          label={t('device-manager.buttons.add-device')}
          onClick={onAddDevice}
          disabled={!allowAddDevice}
        />
      </>
    );
  }
);

const PageHeader = ({
  showButtons,
  allowSave,
  allowAddDevice,
  onSave,
  onAddDevice,
  mobileModeStore,
}) => {
  const { t } = useTranslation();
  return (
    <PageTitle title={t('device-manager.labels.title')}>
      {showButtons && (
        <div className="pull-right button-group">
          <HeaderButtons
            allowSave={allowSave}
            allowAddDevice={allowAddDevice}
            onSave={onSave}
            onAddDevice={onAddDevice}
            mobileModeStore={mobileModeStore}
          />
        </div>
      )}
    </PageTitle>
  );
};

const DeviceManagerPage = observer(({ pageStore }) => {
  const checkMobile = useMediaQuery({ maxWidth: 991 });
  useEffect(() => {
    pageStore.tabs.mobileModeStore.setMobileMode(checkMobile);
  });
  return (
    <PageWrapper
      error={pageStore.pageWrapperStore.error}
      className={'device-manager-page'}
      accessLevelStore={pageStore.accessLevelStore}
    >
      <SelectModal {...pageStore.selectModalState} />
      <ConfirmModal {...pageStore.confirmModalState} />
      <AddDeviceModal {...pageStore.addDeviceModalState} />
      <PageHeader
        showButtons={!pageStore.pageWrapperStore.loading && pageStore.loaded}
        allowSave={pageStore.allowSave}
        allowAddDevice={pageStore.tabs.hasPortTabs}
        onSave={() => pageStore.save()}
        onAddDevice={() => pageStore.addDevice()}
        mobileModeStore={pageStore.tabs.mobileModeStore}
      />
      <PageBody loading={pageStore.pageWrapperStore.loading}>
        {!pageStore.tabs.isEmpty && (
          <PageTabs
            tabs={pageStore.tabs.items}
            selectedIndex={pageStore.tabs.selectedTabIndex}
            onSelect={(index, lastIndex) => pageStore.tabs.onSelectTab(index, lastIndex)}
            onDeleteTab={() => pageStore.deleteTab()}
            onCopyTab={() => pageStore.tabs.copySelectedTab()}
            onAddPort={() => pageStore.addPort()}
            showButtons={!pageStore.pageWrapperStore.loading && pageStore.loaded}
            deviceTypeSelectOptions={pageStore.deviceTypeSelectOptions}
            onDeviceTypeChange={(tab, type) => pageStore.changeDeviceType(tab, type)}
            mobileModeStore={pageStore.tabs.mobileModeStore}
          />
        )}
      </PageBody>
    </PageWrapper>
  );
});

function CreateDeviceManagerPage({ pageStore }) {
  return <DeviceManagerPage pageStore={pageStore} />;
}

export default CreateDeviceManagerPage;
