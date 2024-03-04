import React from 'react';
import { BootstrapLikeSelect, Button, ErrorBar } from '../common';
import { PageWrapper, PageBody, PageTitle } from '../components/page-wrapper/pageWrapper';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { VerticalTabs, TabContent, TabItem, TabPane, TabsList } from '../components/tabs/tabs';
import JsonEditor from '../components/json-editor/jsonEditor';
import { SelectModal } from '../components/modals/selectModal';
import ConfirmModal from '../components/modals/confirmModal';
import AddDeviceModal from './addDeviceModal';
import { TabType } from './tabsStore';

const CollapseButton = observer(({ hasChildren, collapsed, onCollapse, onRestore }) => {
  if (!hasChildren) {
    return null;
  }

  return (
    <i
      className={
        collapsed ? 'glyphicon glyphicon-chevron-right' : 'glyphicon glyphicon-chevron-down'
      }
      onClick={() => (collapsed ? onRestore() : onCollapse())}
    ></i>
  );
});

const PortTab = observer(({ title, hasErrors, hasChildren, collapsed, onCollapse, onRestore }) => {
  return (
    <div className="port-tab">
      <CollapseButton
        hasChildren={hasChildren}
        collapsed={collapsed}
        onCollapse={onCollapse}
        onRestore={onRestore}
      />
      <span>{title}</span>
      {hasErrors && <i className="glyphicon glyphicon-exclamation-sign"></i>}
    </div>
  );
});

const DeviceTab = ({ title, hasErrors }) => {
  return (
    <div className="device-tab">
      <span>{title}</span>
      {hasErrors && <i className="glyphicon glyphicon-exclamation-sign"></i>}
    </div>
  );
};

const SettingsTab = ({ title, hasErrors }) => {
  return (
    <div className="settings-tab">
      <span>{title}</span>
      {hasErrors && <i className="glyphicon glyphicon-exclamation-sign"></i>}
    </div>
  );
};

function getTabItemContent(tab) {
  if (tab.type == TabType.PORT) {
    return (
      <PortTab
        title={tab.name}
        hasErrors={tab.hasErrors}
        hasChildren={tab.hasChildren}
        collapsed={tab.collapsed}
        onCollapse={tab.collapse}
        onRestore={tab.restore}
      />
    );
  }
  if (tab.type == TabType.SETTINGS) {
    return <SettingsTab title={tab.name} hasErrors={tab.hasErrors} />;
  }
  if (tab.type == TabType.DEVICE) {
    return <DeviceTab title={tab.name} hasErrors={tab.hasErrors} />;
  }
  return null;
}

function makeTabItems(tabs) {
  return tabs.map((tab, index) => {
    return (
      <TabItem key={index} className={tab.hidden ? 'hidden' : ''}>
        {getTabItemContent(tab)}
      </TabItem>
    );
  });
}

function findDeviceTypeSelectOption(options, value) {
  let res;
  options.find(option => {
    if (option?.options) {
      res = option.options.find(option => option.value === value);
      if (res) {
        return true;
      }
      return false;
    }
    if (option.value === value) {
      res = option;
      return true;
    }
    return false;
  });
  return res;
}

const DeviceTabContent = ({
  tab,
  index,
  onDeleteTab,
  onCopyTab,
  deviceTypeSelectOptions,
  onDeviceTypeChange,
}) => {
  const { t } = useTranslation();
  const selectedDeviceType = findDeviceTypeSelectOption(deviceTypeSelectOptions, tab.deviceType);
  return (
    <div>
      <BootstrapLikeSelect
        options={deviceTypeSelectOptions}
        selectedOption={selectedDeviceType}
        onChange={option => onDeviceTypeChange(tab, option.value)}
        className={'pull-left device-tab-control device-type-select'}
      />
      <div className="pull-right button-group device-tab-control">
        <Button
          key="delete"
          label={t('device-manager.buttons.delete')}
          type="danger"
          onClick={onDeleteTab}
          additionalStyles={'device-tab-control'}
        />
        <Button
          key="copy"
          label={t('device-manager.buttons.copy')}
          onClick={onCopyTab}
          additionalStyles={' device-tab-control'}
        />
      </div>
      <JsonEditor
        schema={tab.schema}
        data={tab.editedData}
        root={'cn' + index}
        onChange={tab.setData}
        className={'device-tab-properties'}
      />
    </div>
  );
};

const PortTabContent = ({ tab, index, onDeleteTab }) => {
  const { t } = useTranslation();
  return (
    <div>
      {tab.childrenHasErrors && <ErrorBar msg={t('device-manager.errors.device-config')} />}
      <div>
        <span>{tab.title}</span>
        <div className="pull-right button-group">
          <Button
            key="delete"
            label={t('device-manager.buttons.delete')}
            type="danger"
            onClick={onDeleteTab}
          />
        </div>
      </div>
      <JsonEditor
        schema={tab.schema}
        data={tab.editedData}
        root={'cn' + index}
        onChange={tab.setData}
      />
    </div>
  );
};

const SettingsTabContent = ({ tab, index }) => {
  return (
    <JsonEditor
      schema={tab.schema}
      data={tab.editedData}
      root={'cn' + index}
      onChange={tab.setData}
    />
  );
};

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
  }) => {
    const { t } = useTranslation();
    return (
      <VerticalTabs selectedIndex={selectedIndex} onSelect={onSelect} className={'device-settings'}>
        <div className="device-list-panel">
          <TabsList className={'device-list'}>{makeTabItems(tabs)}</TabsList>
          {showButtons && (
            <Button
              additionalStyles={'add-port-button'}
              label={t('device-manager.buttons.add-port')}
              onClick={onAddPort}
            />
          )}
        </div>
        <TabContent className={'settings-panel'}>
          {makeTabPanes(tabs, onDeleteTab, onCopyTab, deviceTypeSelectOptions, onDeviceTypeChange)}
        </TabContent>
      </VerticalTabs>
    );
  }
);

const PageHeader = ({ showButtons, allowSave, allowAddDevice, onSave, onAddDevice }) => {
  const { t } = useTranslation();
  return (
    <PageTitle title={t('device-manager.labels.title')}>
      {showButtons && (
        <div className="pull-right button-group">
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
        </div>
      )}
    </PageTitle>
  );
};

const DeviceManagerPage = observer(({ pageStore }) => {
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
      />
      <PageBody loading={pageStore.pageWrapperStore.loading}>
        {!pageStore.tabs.isEmpty && (
          <PageTabs
            tabs={pageStore.tabs.items}
            selectedIndex={pageStore.tabs.selectedTabIndex}
            onSelect={(index, lastIndex) => pageStore.onSelectTab(index, lastIndex)}
            onDeleteTab={() => pageStore.deleteTab()}
            onCopyTab={() => pageStore.copyTab()}
            onAddPort={() => pageStore.addPort()}
            showButtons={!pageStore.pageWrapperStore.loading && pageStore.loaded}
            deviceTypeSelectOptions={pageStore.deviceTypeSelectOptions}
            onDeviceTypeChange={(tab, type) => pageStore.changeDeviceType(tab, type)}
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
