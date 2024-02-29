import React from 'react';
import { Button, ErrorBar } from '../common';
import { PageWrapper, PageBody, PageTitle } from '../components/page-wrapper/pageWrapper';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { VerticalTabs, TabContent, TabItem, TabPane, TabsList } from '../components/tabs/tabs';
import JsonEditor from '../components/json-editor/jsonEditor';
import { SelectModal } from '../components/modals/selectModal';
import ConfirmModal from '../components/modals/confirmModal';
import AddDeviceModal from './addDeviceModal';

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
      {hasErrors && <i className="glyphicon glyphicon-exclamation-sign pull-right"></i>}
    </div>
  );
});

const DeviceTab = ({ title, hasErrors }) => {
  return (
    <div className="device-tab">
      <span>{title}</span>
      {hasErrors && <i className="glyphicon glyphicon-exclamation-sign pull-right"></i>}
    </div>
  );
};

function makeTabItems(tabs) {
  return tabs.map((tab, index) => {
    if (tab.type == 'port') {
      return (
        <TabItem key={index}>
          <PortTab
            title={tab.name}
            hasErrors={tab.hasErrors}
            hasChildren={tab.hasChildren}
            collapsed={tab.collapsed}
            onCollapse={tab.collapse}
            onRestore={tab.restore}
          />
        </TabItem>
      );
    }
    return (
      <TabItem key={index} className={tab.hidden ? 'hidden' : ''}>
        <DeviceTab title={tab.name} hasErrors={tab.hasErrors} />
      </TabItem>
    );
  });
}

function makeTabPanes(tabs, onDeleteTab) {
  const { t } = useTranslation();
  return tabs.map((tab, index) => {
    return (
      <TabPane key={index}>
        <div className={tab.type == 'port' ? 'port-tab-content' : 'device-tab-content'}>
          {tab.childrenHasErrors && <ErrorBar msg={t('device-manager.errors.device-config')} />}
          <JsonEditor
            schema={tab.schema}
            data={tab.editedData}
            root={'cn' + index}
            onChange={tab.setData}
          />
          <Button
            additionalStyles="pull-right delete-button"
            key="delete"
            label={t('device-manager.buttons.delete')}
            type="danger"
            onClick={onDeleteTab}
          />
        </div>
      </TabPane>
    );
  });
}

const PageTabs = observer(
  ({ tabs, onSelect, selectedIndex, onDeleteTab, onAddPort, showButtons }) => {
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
        <TabContent className={'settings-panel'}>{makeTabPanes(tabs, onDeleteTab)}</TabContent>
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
        allowAddDevice={!pageStore.tabs.isEmpty}
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
            onAddPort={() => pageStore.addPort()}
            showButtons={!pageStore.pageWrapperStore.loading && pageStore.loaded}
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
