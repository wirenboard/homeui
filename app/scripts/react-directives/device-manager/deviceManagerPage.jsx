import React from 'react';
import { Button } from '../common';
import { PageWrapper, PageBody, PageTitle } from '../components/page-wrapper/pageWrapper';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { VerticalTabs, TabContent, TabItem, TabPane, TabsList } from '../components/tabs/tabs';
import JsonEditor from '../components/json-editor/jsonEditor';
import { SelectModal } from '../components/modals/selectModal';
import ConfirmModal from '../components/modals/confirmModal';

const PortTab = observer(({ title, isValid }) => {
  return (
    <div className="port-tab">
      <span>{title}</span>
      {!isValid && <i className="glyphicon glyphicon-exclamation-sign pull-right"></i>}
    </div>
  );
});

const DeviceTab = ({ title, isValid }) => {
  return (
    <div className="device-tab">
      <span>{title}</span>
      {!isValid && <i className="glyphicon glyphicon-exclamation-sign pull-right"></i>}
    </div>
  );
};

function makeTabItems(tabs) {
  return tabs.map((tab, index) => {
    if (tab.type == 'port') {
      return (
        <TabItem key={index}>
          <PortTab title={tab.name} isValid={tab.isValid} />
        </TabItem>
      );
    }
    return (
      <TabItem key={index}>
        <DeviceTab title={tab.name} isValid={tab.isValid} />
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

const PageTabs = observer(({ tabs, onSelect, selectedIndex, onDeleteTab }) => {
  return (
    <VerticalTabs selectedIndex={selectedIndex} onSelect={onSelect}>
      <TabsList>{makeTabItems(tabs)}</TabsList>
      <TabContent>{makeTabPanes(tabs, onDeleteTab)}</TabContent>
    </VerticalTabs>
  );
});

const PageHeader = ({ showButtons, allowSave, allowAddDevice, onSave, onAddPort, onAddDevice }) => {
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
          <Button label={t('device-manager.buttons.add-port')} onClick={onAddPort} />
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
      <PageHeader
        showButtons={!pageStore.pageWrapperStore.loading && pageStore.loaded}
        allowSave={pageStore.allowSave}
        allowAddDevice={!pageStore.tabs.isEmpty}
        onSave={() => pageStore.save()}
        onAddPort={() => pageStore.addPort()}
        onAddDevice={() => pageStore.addDevice()}
      />
      <PageBody loading={pageStore.pageWrapperStore.loading}>
        {!pageStore.tabs.isEmpty && (
          <PageTabs
            tabs={pageStore.tabs.items}
            selectedIndex={pageStore.tabs.selectedTabIndex}
            onSelect={(index, lastIndex) => pageStore.onSelectTab(index, lastIndex)}
            onDeleteTab={() => pageStore.deleteTab()}
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
